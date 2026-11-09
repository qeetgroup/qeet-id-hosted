"use client";

import { Button, LinkButton, Text, TextField } from "@qeetrix/react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError, apiPost } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowLeftIcon, MailIcon, RotateCwIcon } from "@/platform/icons";

/**
 * Ask for a link to choose a new password. The answer is the same whether or not the address has an
 * account, so the page never tells who has one. The link opens this site's reset page and, after
 * the reset, goes back to the application the person was signing in to.
 */
export function ForgotPasswordForm({
  returnTo,
  branding,
}: {
  returnTo: string;
  branding?: Branding;
}) {
  const { t } = useTranslation("recovery");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const signInHref = `/sign-in${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`;

  async function send() {
    setError(null);
    setBusy(true);
    try {
      // app: the link opens this site's reset page, not the console's. return_to: kept by the
      // server only when it is its own /oauth/authorize address.
      const body: Record<string, string> = { email, app: "hosted_login" };
      if (returnTo) body.return_to = returnTo;
      await apiPost("/v1/auth/forgot-password", body);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("signIn:problems.generic.title"));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send();
  }

  const back = (
    <LinkButton href={signInHref} variant="ghost" size="lg" fullWidth icon={ArrowLeftIcon}>
      {t("forgot.back")}
    </LinkButton>
  );

  if (sent) {
    return (
      <HostedPage
        single
        status="success"
        branding={branding}
        title={t("forgot.sentTitle")}
        description={t("forgot.sentBody", { email })}
      >
        <FormStack>
          <FormAlert title={error} />
          <Text size="md" tone="subtle" render={<p />}>
            {t("forgot.tip")}
          </Text>
          <Button
            type="button"
            variant="soft"
            size="lg"
            fullWidth
            icon={RotateCwIcon}
            loading={busy}
            onClick={() => void send()}
          >
            {t("forgot.again")}
          </Button>
          {back}
        </FormStack>
      </HostedPage>
    );
  }

  return (
    <HostedPage branding={branding} title={t("forgot.title")} description={t("forgot.body")}>
      <form onSubmit={onSubmit}>
        <FormStack>
          <FormAlert title={error} />
          <TextField
            label={t("forgot.label")}
            name="email"
            type="email"
            size="lg"
            required
            autoFocus
            autoComplete="email"
            placeholder={t("forgot.placeholder")}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <Button type="submit" size="lg" fullWidth icon={MailIcon} loading={busy}>
            {busy ? t("forgot.sending") : t("forgot.send")}
          </Button>
          {back}
        </FormStack>
      </form>
    </HostedPage>
  );
}
