import { describe, expect, it } from "vitest";

import { serverConfigProblems } from "../server-config";

describe("serverConfigProblems", () => {
  it("accepts no settings at all, and every well-formed one", () => {
    expect(serverConfigProblems({})).toEqual([]);
    expect(
      serverConfigProblems({
        PUBLIC_API_URL: "http://api.dev.kit.example", // the test kit's plain-http environments
        NEXT_PUBLIC_API_URL: "https://api.id.qeet.in",
        LOGIN_TRUSTED_PROXY_HOPS: "1",
        QEET_ID_RELAY_KEY: "k".repeat(32),
      }),
    ).toEqual([]);
  });

  it.each([
    ["not a URL", "api.id.qeet.in"],
    ["another scheme", "javascript:alert(1)"],
    ["credentials", "https://user:pass@api.id.qeet.in"],
    ["a query", "https://api.id.qeet.in?x=1"],
    ["a fragment", "https://api.id.qeet.in#x"],
  ])("refuses an API URL with %s, naming the variable", (_, value) => {
    expect(serverConfigProblems({ PUBLIC_API_URL: value })).toEqual([
      "PUBLIC_API_URL must be an http(s) URL without credentials, query or fragment",
    ]);
  });

  it("refuses a proxy-hop count that isn't a whole number, and a short relay key", () => {
    expect(
      serverConfigProblems({ LOGIN_TRUSTED_PROXY_HOPS: "one", QEET_ID_RELAY_KEY: "short" }),
    ).toEqual([
      "LOGIN_TRUSTED_PROXY_HOPS must be a whole number",
      "QEET_ID_RELAY_KEY must be at least 32 characters (openssl rand -base64 32)",
    ]);
  });
});
