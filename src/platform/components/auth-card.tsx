"use client";

import { Card, CardContent } from "@qeetrix/ui";
import type { ReactNode } from "react";

import type { Branding } from "@/platform/branding/branding";

import { BrandLogo } from "./brand-logo";

type AuthCardProps = {
  /** Per-tenant branding; renders the tenant logo in place of the Qeet logo. */
  branding?: Branding;
  /** What the screen acts for, shown above the title — the application being signed in to. */
  context?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
};

/**
 * The card frame for every hosted screen: the brand logo, an optional context line, the
 * display-font title and subtitle, then the screen's body. Owns the brand so it shows on mobile
 * too, where the brand panel is hidden. On a phone it drops the card itself — no border, surface
 * or shadow — so the content sits on the page, as Google's and Microsoft's sign-in pages do.
 */
export function AuthCard({ branding, context, title, subtitle, children }: AuthCardProps) {
  return (
    <Card className="w-full max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none sm:rounded-2xl sm:border-border/60 sm:shadow-[0_32px_80px_-32px_rgba(28,12,4,0.22)]">
      <CardContent className="space-y-7 px-0 sm:px-10 sm:py-10">
        <div className="flex items-center">
          <BrandLogo branding={branding} height={28} />
        </div>
        {context}
        <div className="space-y-2">
          <h1 className="auth-title text-3xl leading-tight font-semibold tracking-tight sm:text-[2.5rem]">
            {title}
          </h1>
          {subtitle ? <p className="text-muted-foreground text-base">{subtitle}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
