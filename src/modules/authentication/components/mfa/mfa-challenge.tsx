"use client";

import { Button } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  beginPasskeySecondStep,
  completeSecondStep,
  sendSecondStepCode,
} from "@/modules/authentication/api/mfa";
import type { LoginFactor } from "@/modules/authentication/api/session";
import { ApiError } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { FormAlert } from "@/platform/components/form-alert";
import { HostedPage } from "@/platform/components/hosted-page";
import { formatClock } from "@/platform/format";
import { getAssertion, isCancelled } from "@/platform/webauthn/ceremony";

import { ApproveOnPhone } from "./approve-on-phone";
import { CodeStep } from "./code-step";
import { codeDescription, firstMode, type Mode, passkeyError, waitText, waysOf } from "./mfa-ways";
import { SEND_INTERVAL_SECONDS, sendWait, useSendCooldown } from "./use-send-cooldown";
import { WaysPage } from "./ways-page";

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
}: Readonly<{
  mfaToken: string;
  factors: LoginFactor[];
  /** The account, when the first step named it. */
  email?: string;
  rememberDeviceEnabled: boolean;
  /** How long the organisation remembers a device, when known. */
  rememberDays?: number;
  branding?: Branding;
  onVerified: () => void | Promise<void>;
}>) {
  const { t } = useTranslation("signIn");
  const ways = waysOf(factors);
  const [mode, setMode] = useState<Mode>(() => firstMode(ways));
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { secondsLeft, holdSend } = useSendCooldown();
  const lead = email ? <AccountChip email={email} /> : undefined;

  function go(next: Mode) {
    setWrong(null);
    setError(null);
    setNotice(null);
    setMode(next);
  }

  async function complete(proof: Parameters<typeof completeSecondStep>[1]) {
    await completeSecondStep(mfaToken, { remember, ...proof });
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
      await sendSecondStepCode(mfaToken, factor.id ?? "");
      holdSend(factor, SEND_INTERVAL_SECONDS);
    } catch (err) {
      const wait = sendWait(err);
      if (wait === null) {
        setError(err instanceof ApiError ? err.message : t("problems.generic.title"));
      } else {
        // Sent recently: enter that code, or wait to ask again.
        holdSend(factor, wait);
        setNotice(t("mfa.sendWait", { destination: factor.destination, time: waitText(wait, t) }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyWithPasskey() {
    setError(null);
    setBusy(true);
    try {
      const begin = await beginPasskeySecondStep(mfaToken);
      const credential = await getAssertion(begin.publicKey);
      await complete({ passkey: { session_id: begin.sessionId, credential } });
    } catch (err) {
      // Closing the browser's own prompt is a choice, not an error.
      if (!isCancelled(err)) setError(passkeyError(err, t));
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
    return (
      <WaysPage
        ways={ways}
        busy={busy}
        error={error}
        lead={lead}
        branding={branding}
        onMode={go}
        onSend={(f) => void sendCode(f)}
        onPasskey={() => void verifyWithPasskey()}
      />
    );
  }

  const description = codeDescription(mode, t);
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
