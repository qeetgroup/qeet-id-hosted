"use client";

import { Button, Text } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPost } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowLeftIcon, MailIcon, RotateCwIcon } from "@/platform/icons";

import { type Problem, problemOf } from "../../sign-in-problems";
import { ProblemAlert } from "./problem-alert";

/**
 * Sign in without a password: email a link that signs in once, back to the same application. The
 * answer is the same whether or not the address has an account, so the page never tells who has
 * one. The link signs in the browser it's opened in.
 */
export function LinkStep({
  email,
  tenantId,
  returnTo,
  branding,
  onChangeEmail,
  onUsePassword,
  onBack,
}: {
  email: string;
  tenantId: string;
  returnTo: string;
  branding?: Branding;
  onChangeEmail: () => void;
  /** Back to the password, when the organisation allows passwords. */
  onUsePassword?: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("signIn");
  const [sent, setSent] = useState<"no" | "sent" | "again">("no");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  async function send() {
    setProblem(null);
    setBusy(true);
    try {
      await apiPost("/v1/auth/magic-link/start", {
        tenant_id: tenantId,
        email,
        app: "hosted_login",
        return_to: returnTo,
      });
      setSent((s) => (s === "no" ? "sent" : "again"));
    } catch (err) {
      setProblem(problemOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent !== "no") {
    return (
      <HostedPage
        single
        status="success"
        branding={branding}
        title={t("link.sentTitle")}
        description={t("link.sentBody", { email })}
      >
        <FormStack>
          <ProblemAlert problem={problem} />
          {sent === "again" && !problem && (
            <FormAlert tone="success" title={t("link.resentTitle")}>
              {t("link.resentBody")}
            </FormAlert>
          )}
          <Text size="md" render={<p />}>
            {t("link.where")}
          </Text>
          <Text size="md" tone="subtle" render={<p />}>
            {t("link.spam")}
          </Text>
          <Button
            type="button"
            variant="soft"
            size="lg"
            fullWidth
            icon={RotateCwIcon}
            loading={busy}
            onClick={send}
          >
            {t("link.again")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            icon={ArrowLeftIcon}
            onClick={onBack}
          >
            {t("link.back")}
          </Button>
        </FormStack>
      </HostedPage>
    );
  }

  return (
    <HostedPage
      single
      branding={branding}
      title={t("link.title")}
      description={t("link.body")}
      lead={<AccountChip email={email} action={t("password.change")} onAction={onChangeEmail} />}
    >
      <FormStack>
        <ProblemAlert problem={problem} />
        <Button type="button" size="lg" fullWidth icon={MailIcon} loading={busy} onClick={send}>
          {busy ? t("link.sending") : t("link.send")}
        </Button>
        {onUsePassword && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            disabled={busy}
            onClick={onUsePassword}
          >
            {t("link.usePassword")}
          </Button>
        )}
      </FormStack>
    </HostedPage>
  );
}
