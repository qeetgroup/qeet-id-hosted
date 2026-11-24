import type { Branding } from "@/platform/branding/branding";

import { QeetIdLogo } from "./qeet-id-logo";

/**
 * The logo at the top of every page: the organisation's own, as it uploaded it in the console's
 * branding settings, or Qeet ID's. An organisation's logo is decorative here: the page's title
 * and the application line say where the person is.
 */
export function BrandLogo({ branding }: Readonly<{ branding?: Branding }>) {
  if (branding?.logoUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: organisations' logos load from any host
      <img src={branding.logoUrl} alt="" className="h-8 w-auto max-w-50 object-contain" />
    );
  }
  return <QeetIdLogo />;
}
