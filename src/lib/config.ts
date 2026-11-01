// Edge/proxy-safe constants (no server-only imports).

export const USE_SECURE_COOKIES = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production";

/**
 * `__Host-` cookies require `Secure` + `Path=/` + no `Domain`.
 * Production enforces `__Host-` over HTTPS; local HTTP development falls back to an unprefixed name.
 * TODO(security): always serve production behind TLS (HTTPS) with COOKIE_SECURE unset or "true".
 */
export const SESSION_COOKIE = USE_SECURE_COOKIES
  ? "__Host-expen_session"
  : "expen_session";

export const LOGIN_CSRF_COOKIE = USE_SECURE_COOKIES
  ? "__Host-expen_csrf"
  : "expen_csrf";
