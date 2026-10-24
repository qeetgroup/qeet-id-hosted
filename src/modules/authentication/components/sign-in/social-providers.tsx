"use client";

import { Button, cn, Separator } from "@qeetrix/ui";
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
import { useTranslation } from "react-i18next";

// Provider → brand-logo map for the hosted login's social buttons. Mirrors the
// catalog in the admin app's auth/social.tsx (kept as a focused copy rather than
// a shared package to keep this change small; extract to @qeet-id/providers if it
// drifts). iconClass handles dark-mode legibility (black-only marks invert in
// dark, white-only marks invert in light); `fill` is set only for marks that
// ship without a baked color. These are trademarks and keep their official
// artwork: @qeetrix/icons ships no third-party marks (its AppleIcon is the fruit).
type IconDef = { Icon: typeof Google; iconClass?: string; fill?: string };

const ICONS: Record<string, IconDef> = {
  google: { Icon: Google },
  github: { Icon: Github, iconClass: "dark:invert" },
  microsoft: { Icon: Microsoft },
  apple: { Icon: Apple, iconClass: "invert dark:invert-0" },
  facebook: {
    Icon: Facebook,
    iconClass: "text-[#1877F2]",
    fill: "currentColor",
  },
  x: { Icon: X, iconClass: "dark:invert" },
  linkedin: { Icon: Linkedin },
  gitlab: { Icon: Gitlab },
  bitbucket: { Icon: Bitbucket },
  discord: { Icon: Discord },
  slack: { Icon: Slack },
  twitch: { Icon: Twitch },
  spotify: { Icon: Spotify },
  reddit: { Icon: Reddit },
  atlassian: { Icon: Atlassian },
  salesforce: { Icon: Salesforce },
  okta: { Icon: Okta },
  auth0: { Icon: Auth0 },
  notion: { Icon: Notion, iconClass: "invert dark:invert-0" },
  figma: { Icon: Figma },
  zoom: { Icon: Zoom },
  box: { Icon: Box },
  dropbox: { Icon: Dropbox },
  line: { Icon: Line },
  kakao: { Icon: Kakao },
  naver: { Icon: Naver },
  coinbase: { Icon: Coinbase },
};

/** A provider's brand logo, or a neutral letter chip for unknown providers. */
export function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  const def = ICONS[provider];
  if (!def) {
    return (
      <span
        aria-hidden
        className={cn(
          "bg-muted inline-flex size-5 items-center justify-center rounded-sm text-[11px] font-semibold",
          className,
        )}
      >
        {(provider[0] ?? "?").toUpperCase()}
      </span>
    );
  }
  const { Icon, iconClass, fill } = def;
  return <Icon className={cn("size-5", iconClass, className)} {...(fill ? { fill } : {})} />;
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The organisation's social providers as sign-in buttons, under an "or" divider. */
export function SocialProviders({
  providers,
  disabled,
  onSelect,
}: {
  providers: string[];
  disabled: boolean;
  onSelect: (provider: string) => void;
}) {
  const { t } = useTranslation("signIn");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {t("social.divider")}
        </span>
        <Separator className="flex-1" />
      </div>
      <div className="grid gap-2">
        {providers.map((p) => (
          <Button
            key={p}
            type="button"
            variant="outline"
            className="w-full justify-center gap-2"
            disabled={disabled}
            onClick={() => onSelect(p)}
          >
            <ProviderIcon provider={p} />
            {t(`common:providers.${p}`, { defaultValue: titleCase(p) })}
          </Button>
        ))}
      </div>
    </div>
  );
}
