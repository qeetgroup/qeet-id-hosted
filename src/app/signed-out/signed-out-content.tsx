"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { goTo } from "@/lib/navigation";
import { getApiBaseUrl } from "@/lib/public-config";

// How long an application's sign-out page may take before the message shows
// anyway: one that doesn't answer must not leave the person waiting.
export const FRONTCHANNEL_TIMEOUT_MS = 3000;

// Only web pages are loaded; anything else in the address is ignored.
function webPage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Loads each signed-in application's front-channel sign-out page in a hidden
 * frame (OpenID Connect Front-Channel Logout), then shows the signed-out
 * message, or continues to the application that asked to be returned to,
 * through the API, which only follows a ticket it signed.
 */
export function SignedOutContent({
  frontchannel = [],
  continueTicket = "",
}: {
  frontchannel?: string[];
  continueTicket?: string;
}) {
  const { t } = useTranslation("signOut");
  const pages = frontchannel.filter(webPage);
  const [pending, setPending] = useState(pages.length);
  const finished = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setPending(0), FRONTCHANNEL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const done = pending <= 0;
  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    if (continueTicket) {
      goTo(`${getApiBaseUrl()}/v1/oauth/logout/continue?ticket=${encodeURIComponent(continueTicket)}`);
    }
  }, [done, continueTicket]);

  return (
    <>
      {pages.map((src) => (
        <iframe
          key={src}
          src={src}
          title={t("frontchannelFrame")}
          hidden
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setPending((n) => n - 1)}
          onError={() => setPending((n) => n - 1)}
        />
      ))}
      {done && !continueTicket ? (
        <AuthCard title={t("title")}>
          <p className="text-muted-foreground text-center text-sm">{t("body")}</p>
        </AuthCard>
      ) : (
        <AuthCard title={t("signingOut")}>
          <p role="status" className="text-muted-foreground text-center text-sm">
            {t("signingOutBody")}
          </p>
        </AuthCard>
      )}
    </>
  );
}
