// The one transport to the Qeet ID API, under the typed client (backend.ts). The backend sets
// HttpOnly cookies for the login and enterprise-setup sessions, so every request sends
// credentials; a mutation echoes the CSRF double-submit token unless it carries a bearer
// credential, which the server's CSRF check accepts instead.

import { getApiBaseUrl } from "@/platform/config/public-config";

export class ApiError extends Error {
  status: number;
  code: string;
  // The error's details, as the server sends them (e.g. retry_after).
  metadata?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.metadata = metadata;
  }
}

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  query?: Record<string, string>;
  body?: unknown;
  // A one-time credential sent as a bearer token; the server then needs no CSRF token.
  bearer?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function apiURL(path: string, query?: Record<string, string>): string {
  const url = new URL(path.replace(/^\//, ""), `${getApiBaseUrl()}/`);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  return url.toString();
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m?.[1] === undefined ? null : decodeURIComponent(m[1]);
}

// The server issues `qe_csrf` on any GET; a mutation reads it back and echoes it. Production
// shares the cookie across the sign-in and API hosts through the server's CSRF cookie domain.
async function csrfHeader(): Promise<Record<string, string>> {
  let tok = readCookie("qe_csrf");
  if (!tok) {
    try {
      await fetch(apiURL("/healthz"), { credentials: "include", cache: "no-store" });
    } catch {
      // Best effort: without the cookie the server refuses the mutation, and the page says so.
    }
    tok = readCookie("qe_csrf");
  }
  return tok ? { "X-CSRF-Token": tok } : {};
}

type ErrorEnvelope = {
  error?: { code?: string; message?: string; metadata?: Record<string, unknown> };
};

async function parse(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  const data = text ? safeParse(text) : null;
  if (!res.ok) {
    const err = (data as ErrorEnvelope | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? `http_${res.status}`,
      err?.message ?? "Request failed",
      err?.metadata,
    );
  }
  return data;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/**
 * Sends one request to the API and resolves to its JSON answer (undefined for 204); a refusal
 * throws an ApiError carrying the server's code. Only the typed client calls this.
 */
export async function request(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.bearer) headers.Authorization = `Bearer ${options.bearer}`;
  else if (method !== "GET") Object.assign(headers, await csrfHeader());
  const res = await fetch(apiURL(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    // Answers are about one person or one sign-in: never from a cache.
    cache: "no-store",
    signal: options.signal,
  });
  return parse(res);
}
