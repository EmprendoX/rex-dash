// Thin wrapper for Netlify API v1. All calls are server-side (never expose the
// token to the browser). Errors bubble up as descriptive strings so callers
// can surface them in the UI.

const BASE = "https://api.netlify.com/api/v1";

export function requireNetlifyToken(): string {
  const t = process.env.NETLIFY_AUTH_TOKEN;
  if (!t) {
    throw new Error(
      "NETLIFY_AUTH_TOKEN no está seteado en .env.local (o en las env vars del deploy).",
    );
  }
  return t;
}

export interface NetlifyErrorResponse {
  code?: number;
  message?: string;
  errors?: Record<string, string[]>;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = requireNetlifyToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    // Netlify API calls should never be cached by Next.js's data cache.
    cache: "no-store",
  });

  if (!res.ok) {
    let body: string;
    try {
      const parsed = (await res.json()) as NetlifyErrorResponse;
      body = parsed.message ?? JSON.stringify(parsed);
    } catch {
      body = await res.text().catch(() => "<unreadable>");
    }
    throw new Error(`Netlify API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const netlify = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
