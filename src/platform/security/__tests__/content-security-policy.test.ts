import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, createNonce } from "../content-security-policy";

function directives(policy: string): Record<string, string> {
  return Object.fromEntries(
    policy.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values.join(" ")];
    }),
  );
}

const API = "https://api.id.example";

describe("contentSecurityPolicy", () => {
  it("runs only nonce-carrying scripts and lets no site frame the page", () => {
    const d = directives(contentSecurityPolicy({ nonce: "abc", apiOrigin: API }));
    expect(d["script-src"]).toBe("'self' 'nonce-abc' 'strict-dynamic'");
    expect(d["frame-ancestors"]).toBe("'none'");
    expect(d["object-src"]).toBe("'none'");
    expect(d["base-uri"]).toBe("'self'");
    expect(d["form-action"]).toBe("'self'");
  });

  it("lets the browser call the API, and nothing else off-site", () => {
    expect(directives(contentSecurityPolicy({ nonce: "n", apiOrigin: API }))["connect-src"]).toBe(
      `'self' ${API}`,
    );
  });

  it("frames applications' sign-out pages only on the signed-out page", () => {
    expect(directives(contentSecurityPolicy({ nonce: "n", apiOrigin: API }))["frame-src"]).toBe(
      "'none'",
    );
    expect(
      directives(contentSecurityPolicy({ nonce: "n", apiOrigin: API, framesApps: true }))[
        "frame-src"
      ],
    ).toBe("https: http:");
  });

  it("allows eval and the reload socket in dev mode only", () => {
    const d = directives(contentSecurityPolicy({ nonce: "n", apiOrigin: API, dev: true }));
    expect(d["script-src"]).toContain("'unsafe-eval'");
    expect(d["connect-src"]).toContain("ws:");
  });
});

describe("createNonce", () => {
  it("is 128 random bits, fresh each time", () => {
    const a = createNonce();
    expect(atob(a)).toHaveLength(16);
    expect(createNonce()).not.toBe(a);
  });
});
