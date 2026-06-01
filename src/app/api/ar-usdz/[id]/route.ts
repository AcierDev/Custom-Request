//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🛰️ AR USDZ DELIVERY                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// iOS AR Quick Look needs a real same-origin URL ending in .usdz, served with
// Content-Type model/vnd.usdz+zip (blob:/data: URLs are unreliable on iOS 17+
// and unsupported in Chrome-on-iOS). The client bakes a USDZ from the live
// design, POSTs the bytes here, then launches AR against the GET URL.
//
// Storage: these are short-lived, single-use artifacts (the design is dynamic),
// so they auto-expire after TTL_SECONDS.
//   • Production (Vercel = many serverless instances): MongoDB with a TTL index,
//     so a POST on one instance is readable by a GET on another.
//   • Local / single-process (no MONGODB_URI): an in-memory map — no database
//     needed to test, since the same process serves POST and GET.
// The route path segment includes the ".usdz" suffix (e.g. /api/ar-usdz/<id>.usdz)
// which we strip to key the store; no rewrite needed.

import { Binary, Collection } from "mongodb";
import { getCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

const COLLECTION = "arUsdzCache";
const TTL_SECONDS = 60 * 60; // generated models live 1 hour
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB safety ceiling
const MEM_MAX_ENTRIES = 50; // cap the in-memory fallback

// Only use Mongo when it's actually configured; otherwise the in-memory store
// handles everything (and we avoid a multi-second connect timeout in dev).
const MONGO_ENABLED = Boolean(process.env.MONGODB_URI);

interface UsdzDoc {
  _id: string;
  data: Binary;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory fallback. Pinned to globalThis so it survives dev HMR reloads.
interface MemEntry {
  data: Buffer;
  expiresAt: number;
}
const memStore: Map<string, MemEntry> =
  (globalThis as { __arUsdzMem?: Map<string, MemEntry> }).__arUsdzMem ??
  new Map();
(globalThis as { __arUsdzMem?: Map<string, MemEntry> }).__arUsdzMem = memStore;

function memSweep() {
  const now = Date.now();
  for (const [k, v] of memStore) if (v.expiresAt <= now) memStore.delete(k);
  while (memStore.size > MEM_MAX_ENTRIES) {
    const oldest = memStore.keys().next().value;
    if (oldest === undefined) break;
    memStore.delete(oldest);
  }
}

function keyFromParam(idParam: string): string {
  return idParam.replace(/\.usdz$/i, "");
}

async function usdzCollection(): Promise<Collection<UsdzDoc>> {
  const col = (await getCollection(COLLECTION)) as unknown as Collection<UsdzDoc>;
  // TTL index — Mongo auto-deletes once expiresAt passes. Idempotent.
  await col
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch(() => {});
  return col;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const key = keyFromParam(id);
  if (!key) return new Response("Bad request", { status: 400 });

  const buffer = Buffer.from(await req.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return new Response("Invalid model size", { status: 400 });
  }

  const now = Date.now();
  const expiresAt = now + TTL_SECONDS * 1000;

  // Always keep an in-memory copy (the fast path, and the only store in dev).
  memStore.set(key, { data: buffer, expiresAt });
  memSweep();

  // In production, also persist to Mongo so a different instance can serve it.
  if (MONGO_ENABLED) {
    try {
      const col = await usdzCollection();
      await col.updateOne(
        { _id: key },
        {
          $set: {
            data: new Binary(buffer),
            createdAt: new Date(now),
            expiresAt: new Date(expiresAt),
          },
        },
        { upsert: true }
      );
    } catch (err) {
      // The in-memory copy still lets a same-instance GET succeed.
      console.error("AR USDZ: Mongo persist failed", err);
    }
  }

  return new Response(null, { status: 204 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const key = keyFromParam(id);
  if (!key) return new Response("Bad request", { status: 400 });

  memSweep();
  let body: Buffer | null = null;

  const mem = memStore.get(key);
  if (mem && mem.expiresAt > Date.now()) body = mem.data;

  // Cross-instance fallback (prod): the POST may have landed on another instance.
  if (!body && MONGO_ENABLED) {
    try {
      const col = await usdzCollection();
      const doc = await col.findOne({ _id: key });
      if (doc && doc.data) body = Buffer.from(doc.data.buffer);
    } catch (err) {
      console.error("AR USDZ: Mongo read failed", err);
    }
  }

  if (!body) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      // Critical: non-Safari iOS browsers only launch AR (vs. downloading) when
      // the file is served as model/vnd.usdz+zip.
      "Content-Type": "model/vnd.usdz+zip",
      "Content-Disposition": 'inline; filename="everwood-art.usdz"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
