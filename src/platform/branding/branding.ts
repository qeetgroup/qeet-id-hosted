// An organisation's branding, delivered inline by GET /v1/oauth/login-context so a hosted page
// renders on it from the first paint (no second round-trip). Every field is optional; without
// them the page is Qeet ID's own. The wire shape is snake_case (the server's loginContext handler).
//
// The pages take two things from it, as the mockups draw them: the organisation's logo in place
// of Qeet ID's, and its primary colour in place of Qeet orange for the primary action, links,
// focus and checked controls. The background colour is not used: a page's surfaces are the
// theme's, so light and dark both keep their contrast.

import type { CSSProperties } from "react";

export type Branding = {
  logoUrl?: string;
  primaryColor?: string;
};

export type BrandingDTO = {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
} | null;

export function normalizeBranding(dto?: BrandingDTO): Branding | undefined {
  if (!dto) return undefined;
  const b: Branding = {};
  if (dto.logo_url) b.logoUrl = dto.logo_url;
  if (dto.primary_color && hexToRgb(dto.primary_color)) b.primaryColor = dto.primary_color;
  return Object.keys(b).length ? b : undefined;
}

/** The class that maps the brand variables onto Qeetrix's brand tokens (globals.css). */
export const BRANDED_CLASS = "hosted-branded";

// The surfaces brand-coloured text sits on, as relative luminance: the light theme's canvas
// (oklch 0.985) and the dark theme's raised surface (oklch 0.21), the lightest each draws under
// text. Text that keeps 4.5:1 on these keeps it on every surface of that theme.
const LIGHT_SURFACE = 0.955;
const DARK_SURFACE = 0.0093;

/**
 * The inline variables that put an organisation's colour on a page (BRANDED_CLASS reads them):
 * --brand for filled surfaces, --brand-on for the label on it (whichever of near-black or white
 * reads better), --brand-away for hover and press to step away from that label, and a text colour
 * per theme that keeps 4.5:1. Empty without a primary colour.
 */
export function brandingVars(b?: Branding): CSSProperties {
  const rgb = b?.primaryColor ? hexToRgb(b.primaryColor) : null;
  if (!rgb) return {};
  const on = readableForeground(rgb);
  return {
    "--brand": toHex(rgb),
    "--brand-on": on,
    "--brand-away": on === "#ffffff" ? "black" : "white",
    "--brand-text-light": toHex(readableOn(rgb, LIGHT_SURFACE, [0, 0, 0])),
    "--brand-text-dark": toHex(readableOn(rgb, DARK_SURFACE, [255, 255, 255])),
  } as CSSProperties;
}

/** Whether a page has a colour of its own to apply. */
export function hasBrandColor(b?: Branding): boolean {
  return Boolean(b?.primaryColor && hexToRgb(b.primaryColor));
}

type Rgb = [number, number, number];

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Near-black or white, whichever has more contrast with the colour; black itself when neither
// reaches 4.5:1 (a mid grey).
function readableForeground(rgb: Rgb): string {
  const l = luminance(rgb);
  const dark = contrast(l, luminance([10, 10, 10]));
  const light = contrast(l, 1);
  if (Math.max(dark, light) < 4.5) return "#000000";
  return dark > light ? "#0a0a0a" : "#ffffff";
}

// The colour, mixed toward `toward` in 5% steps until it reads at 4.5:1 on the surface.
function readableOn(rgb: Rgb, surface: number, toward: Rgb): Rgb {
  for (let step = 0; step <= 20; step++) {
    const t = step / 20;
    const mixed = rgb.map((c, i) => Math.round(c + ((toward[i] as number) - c) * t)) as Rgb;
    if (contrast(luminance(mixed), surface) >= 4.5) return mixed;
  }
  return toward;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}
