import { cookies } from "next/headers";
import { LOGIN_CSRF_COOKIE, SESSION_COOKIE } from "@/lib/config";
import {
  callBackend,
  clientKey,
  isTrustedOrigin,
  jsonError,
  rateLimit,
  safeEqualStrings,
  sessionCookieOptions,
} from "@/lib/server/backend";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) return jsonError(403, "Forbidden.");

  const store = await cookies();
  const expectedCsrf = store.get(LOGIN_CSRF_COOKIE)?.value;
  const providedCsrf = request.headers.get("x-csrf-token");
  if (!safeEqualStrings(expectedCsrf, providedCsrf)) {
    return jsonError(403, "Invalid CSRF token.");
  }

  if (!rateLimit(`login:${clientKey(request)}`, 10, 60_000)) {
    return jsonError(429, "Terlalu banyak percobaan. Coba lagi sebentar lagi.");
  }

  let code: unknown;
  try {
    const body: unknown = await request.json();
    code =
      typeof body === "object" && body !== null
        ? (body as { code?: unknown }).code
        : undefined;
  } catch {
    return jsonError(400, "Permintaan tidak valid.");
  }
  if (typeof code !== "string" || code.length === 0 || code.length > 32) {
    return jsonError(400, "Kode login tidak valid.");
  }

  const res = await callBackend("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res) return jsonError(502, "Server tidak dapat dihubungi.");

  if (res.status === 401) {
    return jsonError(401, "Kode salah atau sudah kedaluwarsa.");
  }
  if (res.status === 429) {
    return jsonError(429, "Terlalu banyak percobaan. Coba lagi sebentar lagi.");
  }
  if (!res.ok) return jsonError(502, "Gagal masuk. Coba lagi nanti.");

  const data = (await res.json()) as {
    sessionToken: string;
    csrfToken: string;
    expiresAt: string;
    user: unknown;
    accounts: unknown;
  };

  store.set(LOGIN_CSRF_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  store.set(
    SESSION_COOKIE,
    data.sessionToken,
    sessionCookieOptions(new Date(data.expiresAt)),
  );

  // The bearer token stays in the HttpOnly cookie; it is never returned to browser JS.
  return Response.json(
    {
      user: data.user,
      accounts: data.accounts,
      csrfToken: data.csrfToken,
      expiresAt: data.expiresAt,
    },
    { headers: NO_STORE },
  );
}
