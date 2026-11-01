export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

type Query = Record<string, string | number | undefined | null>;

export async function api<T>(
  path: string,
  opts: { method?: "GET" | "POST" | "PATCH" | "DELETE"; query?: Query; body?: unknown } = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();

  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let res: Response;
  try {
    res = await fetch(`/api/${path}${qs ? `?${qs}` : ""}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server.");
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Terjadi kesalahan.";
    if (res.status === 401 && path !== "auth/login") {
      window.dispatchEvent(new Event("expen:session-expired"));
    }
    throw new ApiError(res.status, msg);
  }
  return data as T;
}
