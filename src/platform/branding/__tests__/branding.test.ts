import assert from "node:assert/strict";
import { test } from "vitest";

import { brandingVars, hasBrandColor, normalizeBranding } from "../branding";

const vars = (primaryColor?: string) =>
  brandingVars(primaryColor ? { primaryColor } : undefined) as Record<string, string>;

test("only a logo and a valid hex primary colour are taken", () => {
  assert.deepEqual(
    normalizeBranding({
      logo_url: "https://example.test/logo.png",
      primary_color: "#123456",
      secondary_color: "#654321",
      background_color: "#f4f4f5",
    }),
    { logoUrl: "https://example.test/logo.png", primaryColor: "#123456" },
  );
  assert.equal(normalizeBranding({ primary_color: "url(https://example.test)" }), undefined);
  assert.equal(normalizeBranding(null), undefined);
  assert.deepEqual(vars(), {});
  assert.equal(hasBrandColor({ logoUrl: "x" }), false);
});

test("the label on the brand colour is whichever of near-black or white reads better", () => {
  assert.equal(vars("#f97316")["--brand-on"], "#0a0a0a");
  assert.equal(vars("#171717")["--brand-on"], "#ffffff");
  assert.equal(vars("#777777")["--brand-on"], "#000000");
  // Hover and press step away from the label, so its contrast only grows.
  assert.equal(vars("#171717")["--brand-away"], "black");
  assert.equal(vars("#f97316")["--brand-away"], "white");
});

test("brand text keeps 4.5:1 on each theme's surfaces", () => {
  // A dark green is already readable on light; on dark it is lightened.
  const green = vars("#2e7d4f");
  assert.equal(green["--brand-text-light"], "#2e7d4f");
  assert.notEqual(green["--brand-text-dark"], "#2e7d4f");
  // A pale yellow can't be text on light as it is, so it is darkened.
  const yellow = vars("#ffe066");
  assert.notEqual(yellow["--brand-text-light"], "#ffe066");
  assert.equal(yellow["--brand-text-dark"], "#ffe066");
  // Three-digit hex is read in full.
  assert.equal(vars("#abc")["--brand"], "#aabbcc");
});
