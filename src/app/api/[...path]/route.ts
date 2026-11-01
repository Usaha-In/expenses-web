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

/**
 * Backend-for-frontend proxy. The browser only talks to this same-origin route; the session
 * token lives in an HttpOnly cookie and is attached server-side. Only an explicit allow-list of
 * backend paths is reachable.
 */
const ALLOWED_PATHS: Array<{ methods: string[]; pattern: RegExp }> = [
  { methods: ["GET"], pattern: /^auth\/me$/ },
  {
    methods: ["GET"],
    pattern: /^accounts\/-?\d{1,16}\/(dashboard|summary|categories|wallets|expenses)$/,
  },
  { methods: ["POST"], pattern: /^accounts\/-?\d{1,16}\/(expenses|wallets|wallets\/main)$/ },
  { methods: ["PATCH", "DELETE"], pattern: /^accounts\/-?\d{1,16}\/expenses\/\d{1,16}$/ },
  { methods: ["DELETE"], pattern: /^accounts\/-?\d{1,16}\/wallets$/ },
];

const MAX_BODY_BYTES = 100_000;

async function handle(request: Request, ctx: RouteContext<"/api/[...path]">) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  const method = request.method.toUpperCase();

  if (!ALLOWED_PATHS.some((p) => p.methods.includes(method) && p.pattern.test(joined))) {
    return jsonError(404, "Not found.");
  }

  if (method !== "GET" && !isTrustedOrigin(request)) return jsonError(403, "Forbidden.");

  const token = await readSessionToken();
  if (!token) return jsonError(401, "Authentication required.");

  let body: string | undefined;
  if (method !== "GET") {
    body = await request.text();
    if (body.length > MAX_BODY_BYTES) return jsonError(413, "Payload too large.");
  }

  const search = new URL(request.url).search;
  const res = await callBackend(`/${joined}${search}`, {
    method,
    token,
    csrf: request.headers.get("x-csrf-token"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body || undefined,
  });
  if (!res) return jsonError(502, "Server tidak dapat dihubungi.");

  if (res.status === 401) {
    const store = await cookies();
    store.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  }

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
};
