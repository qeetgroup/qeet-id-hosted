import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIDFromReturnTo, safeReturnTo } from "./login-context";

const API = "https://api.id.example";
const AUTHORIZE = `${API}/oauth/authorize?client_id=app-1&redirect_uri=https%3A%2F%2Fapp.example%2Fcb`;

beforeEach(() => vi.stubEnv("PUBLIC_API_URL", API));
afterEach(() => vi.unstubAllEnvs());

describe("safeReturnTo", () => {
  it("accepts the API's own authorize URL", () => {
    expect(safeReturnTo(AUTHORIZE)).toBe(AUTHORIZE);
  });

  it.each([
    ["nothing", ""],
    ["another page on the API", `${API}/v1/users`],
    ["the authorize path on another site", "https://evil.example/oauth/authorize"],
    ["a look-alike host", "https://api.id.example.evil.example/oauth/authorize"],
    ["the API over plain http", "http://api.id.example/oauth/authorize"],
    ["a protocol-relative URL", "//evil.example/oauth/authorize"],
    ["a percent-encoded protocol-relative URL", "%2F%2Fevil.example%2Foauth%2Fauthorize"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a malformed URL", "http://"],
  ])("rejects %s", (_, returnTo) => {
    expect(safeReturnTo(returnTo)).toBeNull();
  });
});

describe("clientIDFromReturnTo", () => {
  it("reads the client from an authorize URL", () => {
    expect(clientIDFromReturnTo(AUTHORIZE)).toBe("app-1");
  });

  it("is empty when there is no client to read", () => {
    expect(clientIDFromReturnTo("")).toBe("");
    expect(clientIDFromReturnTo(`${API}/oauth/authorize`)).toBe("");
  });
});
