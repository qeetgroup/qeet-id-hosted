"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { LoginFactor } from "@/modules/authentication/api/session";
import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { type Choice, ChoiceList } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import {
  KeyRoundIcon,
  LockKeyholeIcon,
  MailIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "@/platform/icons";

import type { Mode, Ways } from "./mfa-ways";

/** Try another way: every way the person set up, one task per choice. */
export function WaysPage({
  ways,
  busy,
  error,
  lead,
  branding,
  onMode,
  onSend,
  onPasskey,
}: Readonly<{
  ways: Ways;
  busy: boolean;
  error: string | null;
  lead?: ReactNode;
  branding?: Branding;
  onMode: (mode: Mode) => void;
  onSend: (factor: LoginFactor) => void;
  onPasskey: () => void;
}>) {
  const { t } = useTranslation("signIn");
  const items: Choice[] = [];
  if (ways.push) {
    items.push({
      id: "push",
      icon: SmartphoneIcon,
      title: t("mfa.ways.push.title"),
      detail: t("mfa.ways.push.detail"),
      onClick: () => onMode({ kind: "push" }),
    });
  }
  if (ways.totp) {
    items.push({
      id: "totp",
      icon: ShieldCheckIcon,
      title: t("mfa.ways.totp.title"),
      detail: t("mfa.ways.totp.detail"),
      onClick: () => onMode({ kind: "app" }),
    });
  }
  for (const f of ways.codes) items.push(codeChoice(f, t, onSend));
  if (ways.passkey) {
    items.push({
      id: "passkey",
      icon: KeyRoundIcon,
      title: busy ? t("mfa.passkeyBusy") : t("mfa.ways.passkey.title"),
      detail: t("mfa.ways.passkey.detail"),
      disabled: busy,
      onClick: onPasskey,
    });
  }
  if (ways.recovery) {
    items.push({
      id: "recovery",
      icon: LockKeyholeIcon,
      title: t("mfa.ways.recovery.title"),
      detail: t("mfa.ways.recovery.detail"),
      onClick: () => onMode({ kind: "recovery" }),
    });
  }
  return (
    <HostedPage
      branding={branding}
      title={t("mfa.waysTitle")}
      description={t("mfa.waysBody")}
      lead={lead}
    >
      <div className="flex flex-col gap-5">
        <FormAlert title={error} />
        <ChoiceList label={t("mfa.waysLabel")} items={items} />
      </div>
    </HostedPage>
  );
}

// A code sent by email or text message, named by where it goes.
function codeChoice(
  factor: LoginFactor,
  t: ReturnType<typeof useTranslation<"signIn">>["t"],
  onSend: (factor: LoginFactor) => void,
): Choice {
  const way = factor.type === "sms" ? "sms" : "email";
  return {
    id: factor.id ?? way,
    icon: way === "sms" ? MessageSquareTextIcon : MailIcon,
    title: t(`mfa.ways.${way}.title`),
    detail: t(`mfa.ways.${way}.detail`, { destination: factor.destination }),
    onClick: () => onSend(factor),
  };
}
