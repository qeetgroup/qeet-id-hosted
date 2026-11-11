"use client";

import { Button, LinkButton, Spinner, Text } from "@qeetrix/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { getApiBaseUrl } from "@/platform/config/public-config";
import { ArrowRightIcon, CheckIcon, LogInIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";

// How long an application's sign-out page may take before it counts as done anyway: one that
// doesn't answer must not leave the person waiting.
export const FRONTCHANNEL_TIMEOUT_MS = 3000;

// Only web pages are loaded; anything else in the address is ignored.
function webPage(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * After a sign-out: each signed-in application's front-channel sign-out page loads in a hidden frame
 * (OpenID Connect Front-Channel Logout), and its row ticks as it finishes. Then the page says it's
 * done, or goes on to the application that asked to be returned to, through the server, which only
 * follows a ticket it signed. An application is named by its site, which is what the address gives.
 */
export function SignedOutContent({
  frontchannel = [],
  continueTicket = "",
}: {
  frontchannel?: string[];
  continueTicket?: string;
}) {
  const { t } = useTranslation("signOut");
  const pages = frontchannel.map(webPage).filter((u): u is URL => u !== null);
  const [finished, setFinished] = useState<Set<string>>(() => new Set());
  const [timedOut, setTimedOut] = useState(false);
  const continued = useRef(false);
  const continueHref = continueTicket
    ? `${getApiBaseUrl()}/v1/oauth/logout/continue?ticket=${encodeURIComponent(continueTicket)}`
    : "";

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FRONTCHANNEL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const done = timedOut || pages.every((p) => finished.has(p.href));
  useEffect(() => {
    if (!done || !continueHref || continued.current) return;
    continued.current = true;
    goTo(continueHref);
  }, [done, continueHref]);

  const finish = (href: string) => setFinished((s) => new Set(s).add(href));

  return (
    <>
      {pages.map((p) => (
        <iframe
          key={p.href}
          src={p.href}
          title={t("frontchannelFrame")}
          hidden
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => finish(p.href)}
          onError={() => finish(p.href)}
        />
      ))}
      <HostedPage
        single
        status={done ? "success" : undefined}
        title={done ? t("doneTitle") : t("busyTitle")}
        description={done ? (pages.length ? t("doneBody") : t("doneBodyNone")) : t("busyBody")}
      >
        <FormStack>
          {pages.length > 0 && (
            <ul
              aria-label={t("list")}
              className="divide-y divide-border-subtle rounded-surface border border-border-default"
            >
              {pages.map((p) => {
                const app = p.hostname.replace(/^www\./, "");
                const pending = !done && !finished.has(p.href);
                return (
                  <li key={p.href} className="flex items-center gap-3 px-4 py-3">
                    {pending ? (
                      <Spinner size="sm" tone="brand" label={t("rowBusyLabel", { app })} />
                    ) : (
                      <CheckIcon size={18} className="text-icon-success" />
                    )}
                    <Text size="md" className="min-w-0 flex-1" truncate>
                      {app}
                    </Text>
                    <Text size="sm" tone="subtle">
                      {pending ? t("rowBusy") : t("rowDone")}
                    </Text>
                  </li>
                );
              })}
            </ul>
          )}
          {done && continueHref && (
            <Button
              type="button"
              size="lg"
              fullWidth
              icon={ArrowRightIcon}
              onClick={() => goTo(continueHref)}
            >
              {t("back")}
            </Button>
          )}
          {done && (
            <LinkButton href="/sign-in" variant="ghost" size="lg" fullWidth icon={LogInIcon}>
              {t("again")}
            </LinkButton>
          )}
        </FormStack>
      </HostedPage>
    </>
  );
}
