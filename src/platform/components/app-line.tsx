"use client";

import { Text } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// The server accepts only https for an application's logo; anything else is not drawn here either.
function httpsUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * An application's logo on a white tile in light and dark alike, so its own colours stay true; its
 * initial when it has no logo, or the logo fails to load.
 */
export function AppTile({
  name,
  logoUri,
  size = 32,
}: Readonly<{
  name: string;
  logoUri?: string;
  size?: number;
}>) {
  const [failed, setFailed] = useState(false);
  const logo = failed ? undefined : httpsUrl(logoUri);
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "";
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center overflow-hidden rounded-control bg-[#ffffff] text-[#191818] ring-1 ring-border-default"
      style={{ width: size, height: size }}
    >
      {logo ? (
        // biome-ignore lint/performance/noImgElement: application logos load from any host
        <img
          src={logo}
          alt=""
          onError={() => setFailed(true)}
          className="object-contain"
          style={{ width: Math.round(size * 0.7), height: Math.round(size * 0.7) }}
        />
      ) : (
        <span className="typography-title-sm">{initial}</span>
      )}
    </span>
  );
}

/** "to continue to Brightleaf Portal", with the application's logo: where the person is going. */
export function AppLine({
  name,
  logoUri,
  prefix,
}: Readonly<{
  name: string;
  logoUri?: string;
  /** The words before the name; "to continue to" by default. */
  prefix?: string;
}>) {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-center gap-3">
      <AppTile name={name} logoUri={logoUri} />
      <Text size="md" tone="subtle" render={<p />}>
        {prefix ?? t("app.continueTo")}{" "}
        <Text weight="semibold" tone="default">
          {name}
        </Text>
      </Text>
    </div>
  );
}
