// Bearer-token gate for /api/agent/*. Key comes from env AGENT_API_KEY;
// comparison hashes both sides so timingSafeEqual sees equal lengths.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const BEARER_PREFIX = "Bearer ";

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

/** Returns an error response, or null when the request is authorized. */
export function requireAgentAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.AGENT_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "agent API disabled" }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length).trim() : "";
  if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  return null;
}
