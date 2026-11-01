import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/config";
import {
  callBackend,
  isTrustedOrigin,
  jsonError,
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/server/backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) return jsonError(403, "Forbidden.");

  const token = await readSessionToken();
  if (token) {
    // Best effort: invalidate server-side. The cookie is cleared regardless.
    await callBackend("/auth/logout", {
      method: "POST",
      token,
      csrf: request.headers.get("x-csrf-token"),
    });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });

  return Response.json({ loggedOut: true }, { headers: { "Cache-Control": "no-store" } });
}
