import { describe, expect, it } from "vitest";

import { relayHeadersFor, visitorAddress } from "./relay";

describe("visitorAddress", () => {
  it("counts trusted proxies from the right, so a forged leftmost entry is ignored", () => {
    expect(visitorAddress("6.6.6.6, 198.51.100.7", 1)).toBe("198.51.100.7");
  });

  it("knows no address without a trusted proxy, or from a short chain or a non-address", () => {
    expect(visitorAddress("198.51.100.7", 0)).toBeNull();
    expect(visitorAddress("198.51.100.7", 2)).toBeNull();
    expect(visitorAddress("not-an-ip", 1)).toBeNull();
    expect(visitorAddress("2001:db8::1", 1)).toBe("2001:db8::1");
  });
});

describe("relayHeadersFor", () => {
  it("names the visitor's address with the relay key", () => {
    expect(
      relayHeadersFor("198.51.100.7", {
        QEET_ID_RELAY_KEY: "k".repeat(40),
        LOGIN_TRUSTED_PROXY_HOPS: "1",
      }),
    ).toEqual({ "X-Qeet-Relay-Key": "k".repeat(40), "X-Qeet-Client-IP": "198.51.100.7" });
  });

  it("sends nothing without a key or an address", () => {
    expect(relayHeadersFor("198.51.100.7", { LOGIN_TRUSTED_PROXY_HOPS: "1" })).toEqual({});
    expect(
      relayHeadersFor(null, { QEET_ID_RELAY_KEY: "k".repeat(40), LOGIN_TRUSTED_PROXY_HOPS: "1" }),
    ).toEqual({});
  });
});
