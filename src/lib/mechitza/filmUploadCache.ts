import { randomBytes } from "node:crypto";
import { Binary, type Collection } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

const TTL_SECONDS = 15 * 60;
const COLLECTION = "mechitzaFilmUploadCache";
const MAX_LOCAL_UPLOADS = 100;
const USE_MONGO = Boolean(process.env.MONGODB_URI);

interface CachedFilm {
  jpeg: Buffer;
  expiresAt: Date;
}

interface FilmDocument {
  _id: string;
  jpeg: Binary;
  expiresAt: Date;
}

const localUploads = new Map<string, CachedFilm>();
let collectionPromise: Promise<Collection<FilmDocument>> | undefined;

function uploadCollection() {
  collectionPromise ??= (async () => {
    const database = await getMongoDb();
    const collection = database.collection<FilmDocument>(COLLECTION);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    return collection;
  })().catch((error) => {
    collectionPromise = undefined;
    throw error;
  });
  return collectionPromise;
}

export async function saveFilmUpload(jpeg: Buffer) {
  const id = randomBytes(24).toString("hex");
  const now = Date.now();
  const expiresAt = new Date(now + TTL_SECONDS * 1000);
  if (USE_MONGO) {
    const collection = await uploadCollection();
    await collection.insertOne({ _id: id, jpeg: new Binary(jpeg), expiresAt });
  } else {
    // A Vercel upload and the native viewer's GET may reach different instances.
    if (process.env.VERCEL === "1") throw new Error("Temporary model storage is not configured");
    for (const [key, entry] of localUploads) {
      if (entry.expiresAt.getTime() <= now) localUploads.delete(key);
    }
    if (localUploads.size >= MAX_LOCAL_UPLOADS) {
      const oldest = localUploads.keys().next().value;
      if (oldest) localUploads.delete(oldest);
    }
    localUploads.set(id, { jpeg, expiresAt });
    setTimeout(() => localUploads.delete(id), TTL_SECONDS * 1000).unref();
  }
  return { id, expiresAt };
}

export async function getFilmUpload(id: string): Promise<Buffer | null> {
  if (!/^[0-9a-f]{48}$/.test(id)) return null;
  if (USE_MONGO) {
    const collection = await uploadCollection();
    const document = await collection.findOne({ _id: id, expiresAt: { $gt: new Date() } });
    return document ? Buffer.from(document.jpeg.value()) : null;
  }
  const entry = localUploads.get(id);
  if (!entry) return null;
  if (entry.expiresAt.getTime() > Date.now()) return entry.jpeg;
  localUploads.delete(id);
  return null;
}
