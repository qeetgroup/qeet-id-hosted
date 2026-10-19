// Test-only stand-in for the Qeet ID API. It answers fetch by "METHOD /path",
// records each call, and points the app at TEST_API, so form tests never reach
// a live server.
import { vi } from "vitest";

export const TEST_API = "https://api.id.example";

/** The API's own authorize URL for client app-1: the return_to a real flow carries. */
export const AUTHORIZE = `${TEST_API}/oauth/authorize?client_id=app-1&response_type=code`;

export type ApiCall = { method: string; path: string; body: unknown };
type Reply = { status: number; body?: unknown } | Error;

export function mockApi(routes: Record<string, Reply>): ApiCall[] {
  const calls: ApiCall[] = [];
  window.__QEET_PUBLIC_CONFIG__ = { apiUrl: TEST_API };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      // The CSRF seed request a mutation makes when no qe_csrf cookie is set.
      if (method === "GET" && url.pathname === "/healthz") return new Response(null, { status: 204 });
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, path: url.pathname, body });
      const reply = routes[`${method} ${url.pathname}`];
      if (!reply) throw new Error(`Unexpected request ${method} ${url.pathname}`);
      if (reply instanceof Error) throw reply;
      // 204 and similar statuses carry no body.
      if (reply.status === 204) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(reply.body ?? {}), {
        status: reply.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}
