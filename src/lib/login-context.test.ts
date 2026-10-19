import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIDFromReturnTo, returnsToDevice, safeReturnTo } from "./login-context";

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

describe("safeReturnTo for the hosted login's own pages", () => {
  const DEVICE = "/device?user_code=ABCD-EFGH";

  it("accepts the device approval page with its code", () => {
    expect(safeReturnTo(DEVICE)).toBe(DEVICE);
    expect(safeReturnTo("/device")).toBe("/device");
  });

  it.each([
    ["a page that isn't on the list", "/security"],
    ["a look-alike page", "/devices"],
    ["a path that climbs out of the device page", "/device/../logout"],
    ["a protocol-relative path", "//evil.example/device"],
    ["a backslash path", "/\\evil.example/device"],
    ["an encoded protocol-relative path", "/%2Fevil.example/device"],
    ["an encoded backslash", "/%5Cevil.example/device"],
    ["a path hiding a tab", "/\t/evil.example/device"],
    ["a malformed escape", "/device?user_code=%E0%A4%A"],
  ])("rejects %s", (_, returnTo) => {
    expect(safeReturnTo(returnTo)).toBeNull();
  });
});

describe("returnsToDevice", () => {
  it("is true only on the way to approve a device", () => {
    expect(returnsToDevice("/device?user_code=ABCD-EFGH")).toBe(true);
    expect(returnsToDevice(AUTHORIZE)).toBe(false);
    expect(returnsToDevice("//evil.example/device")).toBe(false);
    expect(returnsToDevice("")).toBe(false);
  });
});
