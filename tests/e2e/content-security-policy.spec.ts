import { expect, test } from "@playwright/test";

import { open, PAGES } from "./pages";

// Every page loads and hydrates under its policy without one violation: an inline script
// without the nonce, or a request to a host the policy doesn't name, fails here.
for (const path of PAGES) {
  test(`${path} runs under its Content-Security-Policy without a violation`, async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { cspViolations: string[] }).cspViolations = seen;
      document.addEventListener("securitypolicyviolation", (e) =>
        seen.push(`${e.effectiveDirective} blocked ${e.blockedURI || "inline"}`),
      );
    });

    const response = await open(page, path);

    expect(response?.headers()["content-security-policy"]).toContain("'strict-dynamic'");
    // The layout's inline config script ran, so the nonce reached it.
    expect(await page.evaluate(() => typeof window.__QEET_PUBLIC_CONFIG__)).toBe("object");
    expect(
      await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations),
    ).toEqual([]);
  });
}
