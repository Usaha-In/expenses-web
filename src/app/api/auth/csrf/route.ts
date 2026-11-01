import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { LOGIN_CSRF_COOKIE } from "@/lib/config";
import { sessionCookieOptions } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  const csrfToken = randomBytes(24).toString("base64url");
  const store = await cookies();
  store.set(LOGIN_CSRF_COOKIE, csrfToken, {
    ...sessionCookieOptions(),
    maxAge: 600,
  });

  return Response.json(
    { csrfToken },
    { headers: { "Cache-Control": "no-store" } },
  );
}
