"use client";

import { Button, Text } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowRightIcon, CheckIcon, KeyRoundIcon } from "@/platform/icons";
import { addPasskey, passkeyErrorKey } from "@/platform/webauthn/passkeys";

/**
 * After a sign-in with a password or a link, a passkey is offered once, so the next sign-in needs
 * none: three lines say what changes before the browser's own prompt. Not now, or Continue once
 * added, goes on to the application exactly as the sign-in would have. The passkey is named after
 * this browser and can be renamed on the passkeys page.
 */
export function PasskeyOffer({
  email,
  branding,
  onContinue,
}: Readonly<{
  email: string;
  branding?: Branding;
  onContinue: () => void;
}>) {
  const { t } = useTranslation("signIn");
  const { t: ts } = useTranslation("security");
  const [state, setState] = useState<"offer" | "waiting" | "added" | "exists">("offer");
  const [error, setError] = useState<string | null>(null);
  const lead = email ? <AccountChip email={email} /> : undefined;

  async function add() {
    setError(null);
    setState("waiting");
    try {
      await addPasskey("");
      setState("added");
    } catch (err) {
      const key = passkeyErrorKey(err);
      if (key === "errors.alreadyRegistered") {
        setState("exists");
        return;
      }
      setError(key);
      setState("offer");
    }
  }

  if (state === "added" || state === "exists") {
    return (
      <HostedPage
        single
        status="success"
        branding={branding}
        title={t(state === "added" ? "offer.addedTitle" : "offer.existsTitle")}
        description={t(state === "added" ? "offer.addedBody" : "offer.existsBody")}
        lead={lead}
      >
        <Button type="button" size="lg" fullWidth icon={ArrowRightIcon} onClick={onContinue}>
          {t("offer.continue")}
        </Button>
      </HostedPage>
    );
  }

  const waiting = state === "waiting";
  const facts = [t("offer.fact1"), t("offer.fact2"), t("offer.fact3")];
  return (
    <HostedPage
      branding={branding}
      title={t("offer.title")}
      description={t("offer.body")}
      lead={lead}
    >
      <FormStack>
        {error === "errors.cancelled" ? (
          <FormAlert tone="warning" title={t("offer.cancelledTitle")}>
            {t("offer.cancelledBody")}
          </FormAlert>
        ) : (
          error && <FormAlert title={ts(error)} />
        )}
        <ul className="flex flex-col gap-3">
          {facts.map((f) => (
            <li key={f} className="grid grid-cols-[20px_1fr] gap-x-3">
              <CheckIcon size={18} className="mt-0.5 text-icon-success" />
              <Text size="md">{f}</Text>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="lg"
          fullWidth
          icon={KeyRoundIcon}
          loading={waiting}
          className="mt-2"
          onClick={add}
        >
          {waiting ? t("offer.waiting") : t("offer.add")}
        </Button>
        {waiting && (
          <Text size="sm" tone="subtle" className="-mt-3" render={<p role="status" />}>
            {t("offer.waitingHelp")}
          </Text>
        )}
        <Button
          type="button"
          variant="ghost"
          size="lg"
          fullWidth
          disabled={waiting}
          onClick={onContinue}
        >
          {t("offer.skip")}
        </Button>
      </FormStack>
    </HostedPage>
  );
}
