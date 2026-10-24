import { QeetWordmarkLogo } from "@qeetrix/icons";

import type { Branding } from "@/platform/branding/branding";

type BrandLogoProps = {
  branding?: Branding;
  height: number;
  /** For a repeat of the logo that a screen reader should skip (the brand panel's). */
  decorative?: boolean;
};

/**
 * The brand as a logo alone, the way the large identity providers show theirs: the tenant's logo
 * when it has one, otherwise the Qeet wordmark, in its light- or dark-surface file by theme.
 */
export function BrandLogo({ branding, height, decorative = false }: BrandLogoProps) {
  if (branding?.logoUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: tenant logos load from any host
      <img
        src={branding.logoUrl}
        alt=""
        style={{ height }}
        className="w-auto max-w-50 object-contain"
      />
    );
  }
  const alt = decorative ? "" : "Qeet";
  return (
    <>
      <QeetWordmarkLogo variant="plain" height={height} alt={alt} className="dark:hidden" />
      <QeetWordmarkLogo
        variant="plain-dark"
        height={height}
        alt={alt}
        className="hidden dark:block"
      />
    </>
  );
}
