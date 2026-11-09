"use client";

import { Button } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LoginFactor } from "@/modules/authentication/session";
import { ApiError, apiPost } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { FormAlert } from "@/platform/components/form-alert";
import { type Choice, ChoiceList } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { formatClock } from "@/platform/format";
import {
  KeyRoundIcon,
  LockKeyholeIcon,
  MailIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "@/platform/icons";

import { ApproveOnPhone } from "./approve-on-phone";
import { CodeStep } from "./code-step";
import { SEND_INTERVAL_SECONDS, sendWait, useSendCooldown } from "./use-send-cooldown";

type Mode =
  | { kind: "app" }
  | { kind: "sent"; factor: LoginFactor }
  | { kind: "recovery" }
  | { kind: "push" }
  | { kind: "ways" };

/**
 * The second step of a sign-in, after the password or link was accepted: a code from the
 * authenticator app by default, or another way the person set up, chosen from Try another way so
 * the page stays one task at a time. It trades the in-memory challenge and one proof for the
 * session cookie. Never in the URL or storage: the challenge token lives in this component only.
 */
export function MfaChallenge({
  mfaToken,
  factors,
  email,
  rememberDeviceEnabled,
  rememberDays,
  branding,
  onVerified,
}: {
  mfaToken: string;
  factors: LoginFactor[];
  /** The account, when the first step named it. */
  email?: string;
  rememberDeviceEnabled: boolean;
  /** How long the organisation remembers a device, when known. */
  rememberDays?: number;
  branding?: Branding;
  onVerified: () => void | Promise<void>;
}) {
  const { t } = useTranslation("signIn");
  // An older server lists no factors: an authenticator app and recovery codes, then.
  const hasTotp = factors.length === 0 || factors.some((f) => f.type === "totp");
  const hasRecovery = factors.length === 0 || factors.some((f) => f.type === "recovery_code");
  const hasPush = factors.some((f) => f.type === "push");
  const hasPasskey = factors.some((f) => f.type === "passkey");
  const codeFactors = factors.filter((f) => (f.type === "email" || f.type === "sms") && f.id);

  const [mode, setMode] = useState<Mode>(
    hasTotp ? { kind: "app" } : hasPush ? { kind: "push" } : { kind: "ways" },
  );
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { secondsLeft, holdSend } = useSendCooldown();
  const lead = email ? <AccountChip email={email} /> : undefined;

  function waitText(seconds: number): string {
    return seconds < 60
      ? t("mfa.wait.seconds", { count: seconds })
      : t("mfa.wait.minutes", { count: Math.ceil(seconds / 60) });
  }

  function go(next: Mode) {
    setWrong(null);
    setError(null);
    setNotice(null);
    setMode(next);
  }

  async function complete(proof: Record<string, unknown>) {
    await apiPost("/v1/auth/session/mfa", { mfa_token: mfaToken, remember, ...proof });
    await onVerified();
  }

  async function verify(code: string) {
    setWrong(null);
    setError(null);
    setBusy(true);
    try {
      await complete({ code });
    } catch (err) {
      if (err instanceof ApiError && err.code === "mfa.code_invalid") {
        setWrong(mode.kind === "sent" ? t("mfa.wrongSent") : t("mfa.wrong"));
      } else {
        setError(err instanceof ApiError ? err.message : t("problems.generic.title"));
      }
      setBusy(false);
    }
  }

  async function sendCode(factor: LoginFactor) {
    go({ kind: "sent", factor });
    setBusy(true);
    try {
      await apiPost("/v1/auth/mfa/send", { mfa_token: mfaToken, factor_id: factor.id });
      holdSend(factor, SEND_INTERVAL_SECONDS);
    } catch (err) {
      const wait = sendWait(err);
      if (wait === null) {
        setError(err instanceof ApiError ? err.message : t("problems.generic.title"));
      } else {
        // Sent recently: enter that code, or wait to ask again.
        holdSend(factor, wait);
        setNotice(t("mfa.sendWait", { destination: factor.destination, time: waitText(wait) }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyWithPasskey() {
    setError(null);
    setBusy(true);
    try {
      const PK = window.PublicKeyCredential as
        | (typeof window.PublicKeyCredential & {
            parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
          })
        | undefined;
      if (!PK || !navigator.credentials) throw new Error(t("problems.passkeyUnsupported.title"));
      const begin = await apiPost<{ session_id: string; publicKey: unknown }>(
        "/v1/auth/mfa/passkey/begin",
        { mfa_token: mfaToken },
      );
      const options = PK.parseRequestOptionsFromJSON
        ? PK.parseRequestOptionsFromJSON(begin.publicKey)
        : (begin.publicKey as PublicKeyCredentialRequestOptions);
      const assertion = (await navigator.credentials.get({ publicKey: options })) as
        | (PublicKeyCredential & { toJSON?: () => unknown })
        | null;
      if (!assertion) throw new Error(t("problems.passkey.title"));
      await complete({
        passkey: {
          session_id: begin.session_id,
          credential: assertion.toJSON ? assertion.toJSON() : assertion,
        },
      });
    } catch (err) {
      // Closing the browser's own prompt is a choice, not an error.
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) {
        setError(err instanceof Error ? err.message : t("problems.generic.title"));
      }
      setBusy(false);
    }
  }

  if (mode.kind === "push") {
    return (
      <ApproveOnPhone
        mfaToken={mfaToken}
        remember={remember}
        branding={branding}
        lead={lead}
        onApproved={onVerified}
        onAnother={() => go({ kind: "ways" })}
      />
    );
  }

  if (mode.kind === "ways") {
    const items: Choice[] = [];
    if (hasPush)
      items.push({
        id: "push",
        icon: SmartphoneIcon,
        title: t("mfa.ways.push.title"),
        detail: t("mfa.ways.push.detail"),
        onClick: () => go({ kind: "push" }),
      });
    if (hasTotp)
      items.push({
        id: "totp",
        icon: ShieldCheckIcon,
        title: t("mfa.ways.totp.title"),
        detail: t("mfa.ways.totp.detail"),
        onClick: () => go({ kind: "app" }),
      });
    for (const f of codeFactors) {
      const way = f.type === "sms" ? "sms" : "email";
      items.push({
        id: f.id ?? way,
        icon: way === "sms" ? MessageSquareTextIcon : MailIcon,
        title: t(`mfa.ways.${way}.title`),
        detail: t(`mfa.ways.${way}.detail`, { destination: f.destination }),
        onClick: () => void sendCode(f),
      });
    }
    if (hasPasskey)
      items.push({
        id: "passkey",
        icon: KeyRoundIcon,
        title: busy ? t("mfa.passkeyBusy") : t("mfa.ways.passkey.title"),
        detail: t("mfa.ways.passkey.detail"),
        disabled: busy,
        onClick: () => void verifyWithPasskey(),
      });
    if (hasRecovery)
      items.push({
        id: "recovery",
        icon: LockKeyholeIcon,
        title: t("mfa.ways.recovery.title"),
        detail: t("mfa.ways.recovery.detail"),
        onClick: () => go({ kind: "recovery" }),
      });
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

  const description =
    mode.kind === "recovery"
      ? t("mfa.recoveryBody")
      : mode.kind === "sent"
        ? t(mode.factor.type === "sms" ? "mfa.textedBody" : "mfa.sentBody", {
            destination: mode.factor.destination,
          })
        : t("mfa.appBody");
  const sentFactor = mode.kind === "sent" ? mode.factor : null;
  const left = sentFactor ? secondsLeft(sentFactor) : 0;
  return (
    <HostedPage branding={branding} title={t("mfa.title")} description={description} lead={lead}>
      <div className="flex flex-col gap-5">
        <FormAlert title={error} />
        {notice && <FormAlert tone="info" title={notice} />}
        <CodeStep
          key={mode.kind + (sentFactor?.id ?? "")}
          kind={mode.kind}
          wrong={wrong}
          busy={busy}
          rememberEnabled={rememberDeviceEnabled}
          rememberDays={rememberDays}
          remember={remember}
          onRemember={setRemember}
          onVerify={(code) => void verify(code)}
        >
          {sentFactor && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              fullWidth
              disabled={busy || left > 0}
              onClick={() => void sendCode(sentFactor)}
            >
              {left > 0 ? t("mfa.resendIn", { time: formatClock(left) }) : t("mfa.resend")}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => go({ kind: "ways" })}
          >
            {t("mfa.another")}
          </Button>
        </CodeStep>
      </div>
    </HostedPage>
  );
}
