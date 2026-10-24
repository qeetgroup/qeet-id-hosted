"use client";

import { LayoutGridIcon, ShieldIcon, UsersIcon } from "@qeetrix/icons";
import { cn } from "@qeetrix/ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { type Branding, brandingVars } from "@/platform/branding/branding";
import { PRIVACY_URL, SECURITY_URL, TERMS_URL } from "@/platform/config/site-urls";

import { BrandLogo } from "./brand-logo";
import { LanguageSelect } from "./language-select";
import { ThemeToggle } from "./theme-toggle";

type AuthShellProps = {
  /** Per-tenant branding; drives the panel logo, its glow, and token overrides. */
  branding?: Branding;
  /** A wider column, for a screen whose body is a full form (enterprise setup). */
  wide?: boolean;
  children: ReactNode;
};

/**
 * The split-screen frame for every hosted screen: the brand panel on the left (≥lg), on the
 * theme's subtle surface, and on the right the card with the page footer under it. Applies the
 * tenant's brand colours as CSS-token overrides on the root, so the panel's glow and the form's
 * buttons, links and focus rings take the tenant colour with no per-screen wiring. On a phone
 * it is one column: the card's content sits on the page and the footer at the bottom.
 */
export function AuthShell({ branding, wide = false, children }: AuthShellProps) {
  return (
    <div
      style={brandingVars(branding)}
      className="relative grid min-h-dvh lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]"
    >
      <BrandPanel branding={branding} />
      <div className="max-sm:bg-card flex min-h-dvh flex-col items-center px-6 pt-8 pb-4 sm:justify-center sm:px-10 sm:py-12">
        <div
          className={cn(
            "flex w-full flex-1 flex-col gap-8 sm:flex-none sm:gap-4",
            wide ? "max-w-3xl" : "max-w-[36rem]",
          )}
        >
          <div className="auth-rise flex-1">{children}</div>
          <PageFooter />
        </div>
      </div>
    </div>
  );
}

/**
 * Under the card, where Google's sign-in keeps them: the page-wide language and theme choices on
 * one side, the website's terms, privacy and security pages on the other.
 */
function PageFooter() {
  const { t } = useTranslation("common");
  return (
    <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
      <div className="-ms-2 flex items-center gap-1">
        <LanguageSelect />
        <ThemeToggle />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          [TERMS_URL, t("legal.terms")],
          [PRIVACY_URL, t("legal.privacy")],
          [SECURITY_URL, t("legal.security")],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}

function BrandPanel({ branding }: { branding?: Branding }) {
  const { t } = useTranslation("common");
  // Only what hosted sign-in offers: no SSO entry and no certification claims.
  const features = [
    {
      icon: ShieldIcon,
      title: t("brand.features.passkeys.title"),
      body: t("brand.features.passkeys.body"),
    },
    {
      icon: UsersIcon,
      title: t("brand.features.adaptive.title"),
      body: t("brand.features.adaptive.body"),
    },
    {
      icon: LayoutGridIcon,
      title: t("brand.features.apps.title"),
      body: t("brand.features.apps.body"),
    },
  ];
  return (
    <div className="auth-brand-panel border-border-subtle relative isolate hidden overflow-hidden border-e lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="flex items-center">
        <BrandLogo branding={branding} height={32} decorative />
      </div>

      <div className="max-w-lg space-y-10 py-10">
        <div className="space-y-6">
          <p className="text-muted-foreground text-xs font-medium tracking-[0.32em] whitespace-pre-line uppercase">
            {t("brand.eyebrow")}
          </p>
          <h2 className="auth-title text-4xl leading-[1.08] font-semibold tracking-tight xl:text-5xl 2xl:text-6xl">
            <span className="block whitespace-nowrap">{t("brand.headline")}</span>
            <span className="block whitespace-nowrap">
              {t("brand.headlineSecond")}{" "}
              <span className="text-brand-display">{t("brand.headlineAccent")}</span>
            </span>
          </h2>
          <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
            {t("brand.subhead")}
          </p>
        </div>
        <ul className="space-y-5">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="bg-brand-subtle text-brand-display ring-border-brand/30 grid size-12 shrink-0 place-items-center rounded-full ring-1">
                <Icon aria-hidden className="size-5" />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground text-sm">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <span aria-hidden className="bg-primary block h-0.5 w-10 rounded-full" />
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32em] whitespace-pre-line uppercase">
          {t("brand.footer")}
        </p>
      </div>
    </div>
  );
}
