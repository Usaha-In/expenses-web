import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, USE_SECURE_COOKIES } from "@/lib/config";

export function backendBaseUrl(): string {
  // TODO(security): use HTTPS for BACKEND_API_URL whenever the BFF and backend are not on loopback.
  const url = process.env.BACKEND_API_URL?.trim() || "http://127.0.0.1:3001/api/v1";
  return url.replace(/\/+$/, "");
}

export function sessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax" as const,
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function safeEqualStrings(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
}

/**
 * Browsers always send `Origin` on cross-origin and same-origin POST/PATCH/DELETE fetches.
 * Require it to match the host we are served from (or an explicit allow-list entry).
 */
export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = request.headers.get("host");
  if (host && originHost === host) return true;

  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

const buckets = new Map<string, number[]>();

/** Small in-memory sliding-window limiter (per Next.js instance). */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= now - windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export function clientKey(request: Request): string {
  // TODO(security): x-forwarded-for is only trustworthy behind a reverse proxy you control.
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "local";
}

export function jsonError(status: number, message: string): Response {
  return Response.json(
    { statusCode: status, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Calls the backend; returns null if it is unreachable. */
export async function callBackend(
  path: string,
  init: RequestInit & { token?: string | null; csrf?: string | null },
): Promise<Response | null> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.csrf) headers.set("X-CSRF-Token", init.csrf);
  try {
    return await fetch(`${backendBaseUrl()}${path}`, {
      method: init.method,
      headers,
      body: init.body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return null;
  }
}
