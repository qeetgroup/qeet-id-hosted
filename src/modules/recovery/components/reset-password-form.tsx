"use client";

import { Button, Field, LinkButton } from "@qeetrix/react";
import { PasswordInput } from "@qeetrix/react/experimental";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError, apiPost } from "@/platform/api/client";
import { isPasswordRefusal } from "@/platform/api/errors";
import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowRightIcon, CheckIcon, MailIcon } from "@/platform/icons";
import { safeReturnTo } from "@/platform/navigation/return-to";

// The server's answers for a link that can't reset a password any more.
const LINK_GONE = new Set([
  "recovery.reset_link_invalid",
  "recovery.link_used",
  "recovery.link_expired",
]);

/**
 * Where the reset link lands: a new password the organisation's rules accept (the server names a
 * rule that isn't met, at the field), then sign in with it. Saving signs the account out
 * everywhere else, and the page says so. A used or expired link, or one without its token, offers a
 * new one. Sign in goes back to the application, if the reset started on the way into one.
 */
export function ResetPasswordForm({
  token,
  returnTo,
  branding,
}: {
  token: string;
  returnTo: string;
  branding?: Branding;
}) {
  const { t } = useTranslation("recovery");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"form" | "done" | "gone">(token ? "form" : "gone");

  const dest = safeReturnTo(returnTo);
  const query = dest ? `?return_to=${encodeURIComponent(dest)}` : "";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setBusy(true);
    try {
      await apiPost("/v1/auth/reset-password", { token, new_password: password });
      setState("done");
    } catch (err) {
      if (err instanceof ApiError && LINK_GONE.has(err.code)) setState("gone");
      else if (isPasswordRefusal(err)) setPasswordError(err.message);
      else setError(err instanceof ApiError ? err.message : t("signIn:problems.generic.title"));
    } finally {
      setBusy(false);
    }
  }

  if (state === "done") {
    return (
      <HostedPage
        single
        status="success"
        branding={branding}
        title={t("reset.doneTitle")}
        description={t("reset.doneBody")}
      >
        <LinkButton href={`/sign-in${query}`} size="lg" fullWidth icon={ArrowRightIcon}>
          {t("reset.signIn")}
        </LinkButton>
      </HostedPage>
    );
  }

  if (state === "gone") {
    return (
      <HostedPage
        single
        status="danger"
        branding={branding}
        title={t("reset.expiredTitle")}
        description={t("reset.expiredBody")}
      >
        <LinkButton href={`/forgot-password${query}`} size="lg" fullWidth icon={MailIcon}>
          {t("reset.newLink")}
        </LinkButton>
      </HostedPage>
    );
  }

  return (
    <HostedPage branding={branding} title={t("reset.title")} description={t("reset.body")}>
      <form onSubmit={onSubmit}>
        <FormStack>
          <FormAlert title={error} />
          <Field
            label={t("reset.password")}
            invalid={Boolean(passwordError)}
            error={passwordError ?? undefined}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="new-password"
                required
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
            )}
          </Field>
          <Field
            label={t("reset.confirm")}
            invalid={mismatch}
            error={mismatch ? t("reset.mismatch") : undefined}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="confirm-password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
              />
            )}
          </Field>
          <Button type="submit" size="lg" fullWidth icon={CheckIcon} loading={busy}>
            {busy ? t("reset.saving") : t("reset.save")}
          </Button>
        </FormStack>
      </form>
    </HostedPage>
  );
}
