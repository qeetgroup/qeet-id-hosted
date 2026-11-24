"use client";

import { Button, Field } from "@qeetrix/react";
import { PasswordInput } from "@qeetrix/react/experimental";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormStack, TextLink } from "@/platform/components/form-parts";
import { ArrowRightIcon, MailIcon } from "@/platform/icons";

import type { Problem } from "../../sign-in-problems";
import { ProblemAlert } from "./problem-alert";

/**
 * The password for the address given in the first step (the page's lead shows it, with Change).
 * A wrong password is said at the field; a paused account disables the form and offers the reset.
 * The address goes with the form as a hidden username, so a password manager saves the pair.
 */
export function PasswordStep({
  email,
  forgotHref,
  org,
  problem,
  busy,
  onSubmit,
  onLink,
  onPasskey,
  passwordAllowed = true,
}: Readonly<{
  email: string;
  /** Where Forgot password goes; none on a fresh sign-in an application asked for. */
  forgotHref?: string;
  org?: string;
  problem: Problem | null;
  busy: boolean;
  onSubmit: (password: string) => void;
  /** Email me a sign-in link, when the organisation allows links. */
  onLink?: () => void;
  /** Use a passkey instead, on a fresh sign-in an application asked for. */
  onPasskey?: () => void;
  /** False when the organisation turned passwords off: a fresh sign-in then offers the passkey only. */
  passwordAllowed?: boolean;
}>) {
  const { t } = useTranslation("signIn");
  const [password, setPassword] = useState("");
  const locked = problem?.kind === "locked";
  const wrong = problem?.kind === "wrong";

  function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(password);
  }

  if (!passwordAllowed && onPasskey) {
    return (
      <FormStack>
        <ProblemAlert problem={problem} org={org} />
        <Button type="button" size="lg" fullWidth loading={busy} onClick={onPasskey}>
          {t("again.passkeyOnly")}
        </Button>
      </FormStack>
    );
  }

  return (
    <form onSubmit={submit}>
      <FormStack>
        <ProblemAlert problem={problem} forgotHref={forgotHref} org={org} />
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <Field
          label={t("password.label")}
          invalid={wrong}
          error={wrong ? t("password.wrong") : undefined}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              disabled={locked}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          )}
        </Field>
        {forgotHref && <TextLink href={forgotHref}>{t("password.forgot")}</TextLink>}
        <Button
          type="submit"
          size="lg"
          fullWidth
          icon={ArrowRightIcon}
          disabled={locked}
          loading={busy}
        >
          {busy ? t("password.busy") : t("password.submit")}
        </Button>
        {onPasskey && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            disabled={busy}
            onClick={onPasskey}
          >
            {t("again.usePasskey")}
          </Button>
        )}
        {onLink && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            icon={MailIcon}
            disabled={busy}
            onClick={onLink}
          >
            {t("password.link")}
          </Button>
        )}
      </FormStack>
    </form>
  );
}
