"use client";

import { ProviderButton, ProviderButtonGroup } from "@qeetrix/react/experimental";
import {
  Apple,
  Atlassian,
  Auth0,
  Bitbucket,
  Box,
  Coinbase,
  Discord,
  Dropbox,
  Facebook,
  Figma,
  Github,
  Gitlab,
  Google,
  Kakao,
  Line,
  Linkedin,
  Microsoft,
  Naver,
  Notion,
  Okta,
  Reddit,
  Salesforce,
  Slack,
  Spotify,
  Twitch,
  X,
  Zoom,
} from "@thesvg/react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

// Each provider's own artwork (a trademark, so its official logo: Qeetrix ships no third-party
// marks). invert names the colour scheme a one-colour logo would vanish in.
type Logo = { Logo: ComponentType; invert?: "light" | "dark" };

const LOGOS: Record<string, Logo> = {
  google: { Logo: Google },
  microsoft: { Logo: Microsoft },
  github: { Logo: Github, invert: "dark" },
  apple: { Logo: Apple, invert: "dark" },
  gitlab: { Logo: Gitlab },
  facebook: { Logo: Facebook },
  x: { Logo: X, invert: "dark" },
  linkedin: { Logo: Linkedin },
  bitbucket: { Logo: Bitbucket },
  discord: { Logo: Discord },
  slack: { Logo: Slack },
  twitch: { Logo: Twitch },
  spotify: { Logo: Spotify },
  reddit: { Logo: Reddit },
  atlassian: { Logo: Atlassian },
  salesforce: { Logo: Salesforce },
  okta: { Logo: Okta },
  auth0: { Logo: Auth0 },
  notion: { Logo: Notion, invert: "dark" },
  figma: { Logo: Figma },
  zoom: { Logo: Zoom },
  box: { Logo: Box },
  dropbox: { Logo: Dropbox },
  line: { Logo: Line },
  kakao: { Logo: Kakao },
  naver: { Logo: Naver },
  coinbase: { Logo: Coinbase },
};

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The social sign-ins the organisation turned on, as Qeetrix's ruled row: each provider's logo and
 * name, or (on a phone, globals.css) the logo alone, its button still named in full for screen
 * readers. Three to a row; a fourth or more start the next row.
 */
export function ProviderRow({
  providers,
  disabled,
  onPick,
}: Readonly<{
  providers: string[];
  disabled?: boolean;
  onPick: (provider: string) => void;
}>) {
  const { t } = useTranslation("signIn");
  const rows: string[][] = [];
  for (let i = 0; i < providers.length; i += 3) rows.push(providers.slice(i, i + 3));
  return (
    <div className="hosted-providers flex flex-col gap-2">
      {rows.map((row) => (
        <ProviderButtonGroup key={row.join()} aria-label={t("social.group")}>
          {row.map((p) => {
            const logo = LOGOS[p];
            const name = t(`common:providers.${p}`, { defaultValue: titleCase(p) });
            return (
              <ProviderButton
                key={p}
                logo={logo ? <logo.Logo /> : undefined}
                logoInvert={logo?.invert}
                aria-label={t("social.button", { provider: name })}
                disabled={disabled}
                onClick={() => onPick(p)}
              >
                {name}
              </ProviderButton>
            );
          })}
        </ProviderButtonGroup>
      ))}
    </div>
  );
}
