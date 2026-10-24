"use client";

import { Button, Input, OTPInput } from "@qeetrix/ui";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import { ApiError, apiPost } from "@/lib/api";
import type { Branding } from "@/lib/branding";

// One way to complete the second-factor challenge, as the server lists them.
export type LoginFactor = {
  type: "totp" | "recovery_code" | "email" | "sms" | "passkey" | "push";
  id?: string;
  destination?: string;
};

// The server sends a factor at most one code every 30 seconds (POST
// /v1/auth/mfa/send). A send it refuses as too soon says how long to wait
// (retry_after), which then takes over.
const SEND_INTERVAL_SECONDS = 30;

// sendWait is how many seconds to wait before another code can be sent, when
// err is the server refusing a send as too soon; null for any other failure.
function sendWait(err: unknown): number | null {
  if (!(err instanceof ApiError) || err.code !== "mfa.code_send_limited") return null;
  const after = Number(err.metadata?.retry_after);
  return Number.isFinite(after) && after > 0 ? Math.ceil(after) : SEND_INTERVAL_SECONDS;
}

// MfaChallenge is the second step of a hosted login: the first factor (a
// password or a magic link) was accepted and the user has a second factor
// enrolled. It exchanges the in-memory mfa_token plus a proof for the SSO
// cookie.
export function MfaChallenge({
  mfaToken,
  factors,
  rememberDeviceEnabled,
  branding,
  onVerified,
  onBack,
}: {
  mfaToken: string;
  factors: LoginFactor[];
  rememberDeviceEnabled: boolean;
  branding?: Branding;
  onVerified: () => void | Promise<void>;
  onBack: () => void;
}) {
  const { t } = useTranslation("signIn");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [waitingPush, setWaitingPush] = useState(false);
  // When each factor can be sent another code (epoch ms), and the factor whose
  // send was refused as too soon, which the wait message names.
  const [sendAfter, setSendAfter] = useState<Record<string, number>>({});
  const [refused, setRefused] = useState<{ factor: LoginFactor; seconds: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const stopPush = useRef(false);
  useEffect(
    () => () => {
      stopPush.current = true;
    },
    [],
  );

  // Tick once a second while any factor is waiting, for the time shown.
  const sendWaiting = Object.values(sendAfter).some((at) => at > now);
  useEffect(() => {
    if (!sendWaiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sendWaiting]);

  function secondsLeft(f: LoginFactor): number {
    const at = f.id ? sendAfter[f.id] : undefined;
    return at ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
  }

  function holdSend(f: LoginFactor, seconds: number) {
    const at = Date.now();
    setNow(at);
    setSendAfter((prev) => ({ ...prev, [f.id ?? ""]: at + seconds * 1000 }));
  }

  // A wait as words: seconds under a minute, whole minutes above.
  function waitText(seconds: number): string {
    return seconds < 60
      ? t("mfa.wait.seconds", { count: seconds })
      : t("mfa.wait.minutes", { count: Math.ceil(seconds / 60) });
  }

  const codeFactors = factors.filter((f) => (f.type === "email" || f.type === "sms") && f.id);
  const hasPasskey = factors.some((f) => f.type === "passkey");
  const hasPush = factors.some((f) => f.type === "push");
  const hasRecovery = factors.length === 0 || factors.some((f) => f.type === "recovery_code");
  const onlyAuthenticator = factors.every((f) => f.type === "totp" || f.type === "recovery_code");

  // Completes the challenge with one proof: a code, a passkey assertion, or
  // an approved push.
  async function complete(proof: Record<string, unknown>) {
    await apiPost("/v1/auth/session/mfa", { mfa_token: mfaToken, remember, ...proof });
    await onVerified();
  }

  async function attempt(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      const cancelled = err instanceof Error && err.name === "NotAllowedError";
      if (!cancelled) setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
      setLoading(false);
      setWaitingPush(false);
    }
  }

  function verify(value: string) {
    void attempt(() => complete({ code: value }));
  }

  function sendCode(f: LoginFactor) {
    void attempt(async () => {
      try {
        await apiPost("/v1/auth/mfa/send", { mfa_token: mfaToken, factor_id: f.id });
      } catch (err) {
        const wait = sendWait(err);
        if (wait === null) throw err;
        // Refused as too soon: a code was sent recently, so enter that one or
        // wait to ask again.
        holdSend(f, wait);
        setRefused({ factor: f, seconds: wait });
        setRecovery(false);
        setLoading(false);
        return;
      }
      holdSend(f, SEND_INTERVAL_SECONDS);
      setRefused(null);
      setSentTo(f.destination ?? "");
      setRecovery(false);
      setLoading(false);
    });
  }

  function passkeyFactor() {
    void attempt(async () => {
      const PK = window.PublicKeyCredential as
        | (typeof window.PublicKeyCredential & {
            parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
          })
        | undefined;
      if (!PK || !navigator.credentials) throw new Error(t("errors.passkeyUnsupported"));
      const begin = await apiPost<{ session_id: string; publicKey: unknown }>(
        "/v1/auth/mfa/passkey/begin",
        {
          mfa_token: mfaToken,
        },
      );
      const options = PK.parseRequestOptionsFromJSON
        ? PK.parseRequestOptionsFromJSON(begin.publicKey)
        : (begin.publicKey as PublicKeyCredentialRequestOptions);
      const assertion = (await navigator.credentials.get({
        publicKey: options,
      })) as PublicKeyCredential & {
        toJSON?: () => unknown;
      };
      if (!assertion) throw new Error(t("errors.noPasskeySelected"));
      await complete({
        passkey: {
          session_id: begin.session_id,
          credential: assertion.toJSON ? assertion.toJSON() : assertion,
        },
      });
    });
  }

  // Sends the push request, then asks every two seconds until it is approved
  // (unanswered costs no attempt), denied or expired.
  function approveOnPhone() {
    void attempt(async () => {
      await apiPost("/v1/auth/mfa/push", { mfa_token: mfaToken });
      setWaitingPush(true);
      stopPush.current = false;
      while (!stopPush.current) {
        try {
          await complete({ push: true });
          return;
        } catch (err) {
          if (!(err instanceof ApiError && err.code === "mfa.push_pending")) throw err;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void verify(code);
  }

  function toggleMode() {
    setRecovery((r) => !r);
    setCode("");
    setError(null);
  }

  return (
    <AuthCard
      branding={branding}
      title={t("mfa.title")}
      subtitle={
        recovery
          ? t("mfa.subtitleRecovery")
          : onlyAuthenticator
            ? t("mfa.subtitle")
            : t("mfa.subtitleAny")
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="mfa-code" className="text-sm font-medium">
            {recovery ? t("mfa.recoveryLabel") : t("mfa.label")}
          </label>
          {recovery ? (
            <Input
              id="mfa-code"
              type="text"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("mfa.recoveryPlaceholder")}
            />
          ) : (
            <OTPInput
              value={code}
              onChange={setCode}
              onComplete={(v) => void verify(v)}
              autoFocus
              disabled={loading}
              aria-label={t("mfa.label")}
            />
          )}
          {sentTo && !recovery && (
            <p role="status" className="text-muted-foreground text-xs">
              {t("mfa.codeSentTo", { destination: sentTo })}
            </p>
          )}
          {refused && secondsLeft(refused.factor) > 0 && (
            <p className="text-muted-foreground text-xs">
              {/* The wait is announced once; the time shown counts down. */}
              <span role="status" className="sr-only">
                {t("mfa.sendWait", {
                  destination: refused.factor.destination,
                  time: waitText(refused.seconds),
                })}
              </span>
              <span aria-hidden="true">
                {t("mfa.sendWait", {
                  destination: refused.factor.destination,
                  time: waitText(secondsLeft(refused.factor)),
                })}
              </span>
            </p>
          )}
        </div>

        {rememberDeviceEnabled && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {t("mfa.remember")}
          </label>
        )}

        <FormAlert>{error}</FormAlert>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || code.length === 0}
          loading={loading}
          loadingLabel={t("mfa.submit.busy")}
        >
          {t("mfa.submit.idle")}
        </Button>
      </form>

      {(codeFactors.length > 0 || hasPasskey || hasPush) && (
        <div className="space-y-2">
          {codeFactors.map((f) => {
            const left = secondsLeft(f);
            return (
              <Button
                key={f.id}
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading || left > 0}
                onClick={() => sendCode(f)}
              >
                {left > 0
                  ? t("mfa.sendCodeToIn", { destination: f.destination, time: waitText(left) })
                  : t("mfa.sendCodeTo", { destination: f.destination })}
              </Button>
            );
          })}
          {hasPasskey && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={passkeyFactor}
            >
              {t("mfa.usePasskey")}
            </Button>
          )}
          {hasPush && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={approveOnPhone}
            >
              {waitingPush ? t("mfa.pushWaiting") : t("mfa.pushBtn")}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 text-center">
        {hasRecovery && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
            onClick={toggleMode}
          >
            {recovery ? t("mfa.useTotp") : t("mfa.useRecovery")}
          </button>
        )}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
          disabled={loading}
          onClick={onBack}
        >
          {t("mfa.back")}
        </button>
      </div>
    </AuthCard>
  );
}
