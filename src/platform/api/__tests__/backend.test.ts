// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockApi } from "@/testing/mock-api";

import { assured, assuredItems } from "../assured";
import { backend, fillPath } from "../backend";
import { ApiError } from "../client";

afterEach(() => {
  vi.unstubAllGlobals();
  // biome-ignore lint/suspicious/noDocumentCookie: the test sets and clears the CSRF cookie itself
  document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

describe("fillPath", () => {
  it("fills each placeholder, encoded", () => {
    expect(fillPath("/v1/passkeys/{id}", { id: "a/b c" })).toBe("/v1/passkeys/a%2Fb%20c");
  });

  it("refuses a placeholder without a value, rather than calling another path", () => {
    expect(() => fillPath("/v1/passkeys/{id}", {})).toThrow("No value for {id}");
    expect(() => fillPath("/v1/passkeys/{id}", { id: "" })).toThrow("No value for {id}");
  });
});

describe("backend", () => {
  it("sends the query as the server parses it, and echoes the CSRF token on a mutation", async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: the server's double-submit cookie, set by hand
    document.cookie = "qe_csrf=csrf-1";
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ client_name: "Acme" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    window.__QEET_PUBLIC_CONFIG__ = { apiUrl: "https://api.id.example" };
    vi.stubGlobal("fetch", fetchSpy);

    await backend.get("/v1/oauth/login-context", { query: { client_id: "app 1" } });
    await backend.post("/v1/auth/forgot-password", { body: { email: "ada@example.com" } });

    const [get, post] = fetchSpy.mock.calls as unknown as [string, RequestInit][];
    const [getUrl, getInit] = get ?? ["", {}];
    const [, postInit] = post ?? ["", {}];
    expect(getUrl).toBe("https://api.id.example/v1/oauth/login-context?client_id=app+1");
    expect(new Headers(getInit.headers).get("X-CSRF-Token")).toBeNull();
    expect(getInit.cache).toBe("no-store");
    expect(new Headers(postInit.headers).get("X-CSRF-Token")).toBe("csrf-1");
    expect(postInit.credentials).toBe("include");
  });

  it("sends a one-time credential as a bearer token, in place of the CSRF token", async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: the server's double-submit cookie, set by hand
    document.cookie = "qe_csrf=csrf-1";
    const calls = mockApi({
      "POST /v1/admin-portal/session": {
        status: 201,
        body: { context: {}, expires_at: "", redirect_url: "" },
      },
    });
    await backend.post("/v1/admin-portal/session", { bearer: "one-time" });
    expect(calls[0]?.authorization).toBe("Bearer one-time");
  });

  it("turns a refusal into an ApiError carrying the server's code", async () => {
    mockApi({
      "POST /v1/auth/session": {
        status: 403,
        body: { error: { code: "auth.sso_required", message: "Use your company's sign-in." } },
      },
    });
    const err = await backend
      .post("/v1/auth/session", { body: { email: "a@b.in", password: "p" } })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, code: "auth.sso_required" });
  });
});

describe("assured", () => {
  it("passes a record that has the fields, and fails closed on one that doesn't", () => {
    const record: { id?: string; name?: string | null } = { id: "c1", name: "Okta" };
    expect(assured(record, "id", "name").name).toBe("Okta");
    expect(() => assured({ id: "c1", name: null }, "id", "name")).toThrow(ApiError);
    expect(() => assuredItems([{ id: "c1" }, {}] as { id?: string }[], "id")).toThrow(
      "The server's answer was incomplete.",
    );
    expect(assuredItems(undefined as { id?: string }[] | undefined, "id")).toEqual([]);
  });
});
