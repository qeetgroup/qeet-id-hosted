import assert from "node:assert/strict";
import { test } from "node:test";

import { brandingVars, normalizeBranding } from "./branding";

test("background branding is applied independently of accent colors", () => {
  const brand = normalizeBranding({ background_color: "#f4f4f5" });
  assert.deepEqual(brand, { backgroundColor: "#f4f4f5" });
  assert.deepEqual(brandingVars(brand), { backgroundColor: "#f4f4f5" });
  assert.deepEqual(brandingVars(), {});
  assert.equal(normalizeBranding({ background_color: "url(https://example.test)" }), undefined);
});

test("light brand colors use dark button text and dark colors use white", () => {
  const orange = brandingVars({ primaryColor: "#f97316", secondaryColor: "#8b5cf6" });
  assert.equal((orange as Record<string, string>)["--primary-foreground"], "#0a0a0a");
  const dark = brandingVars({ primaryColor: "#171717" });
  assert.equal((dark as Record<string, string>)["--primary-foreground"], "#ffffff");
  assert.equal((brandingVars({ primaryColor: "#777777" }) as Record<string, string>)["--primary-foreground"], "#000000");
});

test("existing branding remains unchanged when no background is supplied", () => {
  const brand = normalizeBranding({ logo_url: "https://example.test/logo.png", primary_color: "#123456", secondary_color: "#654321" });
  assert.equal(brand?.logoUrl, "https://example.test/logo.png");
  assert.equal(brandingVars(brand).backgroundColor, undefined);
  assert.equal((brandingVars(brand) as Record<string, string>)["--qeet-brand-2"], "#654321");
});