"use client";

import { Button, Link, TextField } from "@qeetrix/react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { AsideLine, OrDivider } from "@/platform/components/form-parts";
import { ArrowRightIcon, KeyRoundIcon } from "@/platform/icons";

import type { Problem } from "../../sign-in-problems";
import { ProblemAlert } from "./problem-alert";
import { ProviderRow } from "./provider-row";

export type EmailStepProps = {
  email: string;
  /** Whether the email leads anywhere: a password or a sign-in link the organisation allows. */
  emailEnabled: boolean;
  passkeyEnabled: boolean;
  providers: string[];
  signUpHref?: string;
  forgotHref: string;
  problem: Problem | null;
  passkeyBusy: boolean;
  onContinue: (email: string) => void;
  onPasskey: () => void;
  onProvider: (provider: string) => void;
};

/**
 * The first step: the email address, then Continue; or a passkey (which needs no email, and is
 * also offered in the email field's suggestions), or a social account the organisation turned on.
 */
export function EmailStep(props: EmailStepProps) {
  const { t } = useTranslation("signIn");
  const [email, setEmail] = useState(props.email);
  const busy = props.passkeyBusy;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    props.onContinue(email.trim());
  }

  return (
    <div>
      <ProblemAlert problem={props.problem} forgotHref={props.forgotHref} className="mb-6" />
      {props.emailEnabled && (
        <form onSubmit={onSubmit}>
          <TextField
            label={t("email.label")}
            name="username"
            type="email"
            size="lg"
            required
            autoFocus
            placeholder={t("email.placeholder")}
            // "webauthn" lets the browser list this site's passkeys in the field's suggestions.
            autoComplete="username webauthn"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <Button
            type="submit"
            size="lg"
            fullWidth
            icon={ArrowRightIcon}
            disabled={busy}
            className="mt-5"
          >
            {t("email.continue")}
          </Button>
        </form>
      )}
      {props.passkeyEnabled && (
        <>
          {props.emailEnabled && <OrDivider label={t("or")} />}
          <Button
            type="button"
            variant="soft"
            size="lg"
            fullWidth
            icon={KeyRoundIcon}
            loading={busy}
            onClick={props.onPasskey}
          >
            {busy ? t("passkey.busy") : t("passkey.idle")}
          </Button>
          {busy && (
            <p role="status" className="mt-2 typography-body-sm text-text-subtle">
              {t("passkey.help")}
            </p>
          )}
        </>
      )}
      {props.providers.length > 0 && (
        <div className={props.passkeyEnabled ? "mt-3" : ""}>
          {!props.passkeyEnabled && props.emailEnabled && <OrDivider label={t("or")} />}
          <ProviderRow providers={props.providers} disabled={busy} onPick={props.onProvider} />
        </div>
      )}
      {props.signUpHref && (
        <div className="mt-8">
          <AsideLine>
            {t("noAccount")}
            <Link href={props.signUpHref}>{t("create")}</Link>
          </AsideLine>
        </div>
      )}
    </div>
  );
}
