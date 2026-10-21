"use client";

import { Button, CopyableSecret, OTPInput, QRCode } from "@qeetrix/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import { ApiError, apiPost } from "@/lib/api";
import type { Branding } from "@/lib/branding";

type Enrollment = { secret: string; provisioning_url: string };

// MfaEnrollment is the hosted-login step for an account that must have a
// second factor and holds none (its organisation requires MFA, or it is marked
// as requiring it): set up an authenticator app and confirm it with a code,
// which sets the SSO cookie, then save the recovery codes shown once. While
// the organisation's grace period runs (dueAt), the setup can be skipped. The
// mfa_token stays in memory only.
export function MfaEnrollment({
  mfaToken,
  dueAt,
  branding,
  onDone,
  onBack,
}: {
  mfaToken: string;
  dueAt?: string;
  branding?: Branding;
  onDone: () => void | Promise<void>;
  onBack?: () => void;
}) {
  const { t, i18n } = useTranslation("login");
  const [app, setApp] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const due = dueAt ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "long" }).format(new Date(dueAt)) : null;

  async function attempt(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  function start() {
    void attempt(async () => {
      setApp(await apiPost<Enrollment>("/v1/auth/mfa/enroll", { mfa_token: mfaToken }));
    });
  }

  function confirm(value: string) {
    void attempt(async () => {
      const res = await apiPost<{ recovery_codes?: string[] }>("/v1/auth/session/mfa", {
        mfa_token: mfaToken,
        code: value,
      });
      if (res.recovery_codes?.length) {
        setCodes(res.recovery_codes);
        return;
      }
      await onDone();
    });
  }

  function skip() {
    void attempt(async () => {
      await apiPost("/v1/auth/session/mfa", { mfa_token: mfaToken, skip: true });
      await onDone();
    });
  }

  function copy(list: string[]) {
    void navigator.clipboard?.writeText(list.join("\n")).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function download(list: string[]) {
    const blob = new Blob([`${list.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (codes) {
    return (
      <AuthCard branding={branding} title={t("mfa.enroll.codesTitle")} subtitle={t("mfa.enroll.codesSubtitle")}>
        <ul className="bg-muted/30 grid grid-cols-2 gap-2 rounded-lg border p-4 font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => copy(codes)}>
            {copied ? t("mfa.enroll.copiedBtn") : t("mfa.enroll.copyBtn")}
          </Button>
          <Button type="button" variant="outline" onClick={() => download(codes)}>
            {t("mfa.enroll.downloadBtn")}
          </Button>
        </div>
        <Button type="button" size="lg" className="w-full" onClick={() => void onDone()}>
          {t("mfa.enroll.continueBtn")}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      branding={branding}
      title={t("mfa.enroll.title")}
      subtitle={due ? t("mfa.enroll.subtitleDue", { date: due }) : t("mfa.enroll.subtitle")}
    >
      {app ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            confirm(code);
          }}
        >
          <div className="space-y-1.5">
            <p id="enroll-scan" className="text-sm font-medium">
              {t("mfa.enroll.scanLabel")}
            </p>
            <div className="flex justify-center">
              <QRCode value={app.provisioning_url} size={200} aria-labelledby="enroll-scan" aria-describedby="enroll-key" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("mfa.enroll.keyLabel")}</p>
            <div id="enroll-key">
              <CopyableSecret value={app.secret} size="sm" />
            </div>
            <p className="text-muted-foreground text-xs">{t("mfa.enroll.keyHint")}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="enroll-code" className="text-sm font-medium">
              {t("mfa.enroll.codeLabel")}
            </label>
            <OTPInput
              id="enroll-code"
              value={code}
              onChange={setCode}
              onComplete={confirm}
              autoFocus
              disabled={loading}
              aria-label={t("mfa.enroll.codeLabel")}
            />
          </div>
          <FormAlert>{error}</FormAlert>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || code.length === 0}
            loading={loading}
            loadingLabel={t("mfa.submit.busy")}
          >
            {t("mfa.enroll.confirmBtn")}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <FormAlert>{error}</FormAlert>
          <Button type="button" size="lg" className="w-full" disabled={loading} loading={loading} onClick={start}>
            {t("mfa.enroll.startBtn")}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-1 text-center">
        {due && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
            disabled={loading}
            onClick={skip}
          >
            {t("mfa.enroll.skipBtn")}
          </button>
        )}
        {onBack && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
            disabled={loading}
            onClick={onBack}
          >
            {t("mfa.back")}
          </button>
        )}
      </div>
    </AuthCard>
  );
}
