"use client";

import { Button, Checkbox, Text } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Branding } from "@/platform/branding/branding";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowRightIcon } from "@/platform/icons";

/**
 * The recovery codes, shown once after two-step verification is set up: each signs in once if the
 * phone is lost. Continue waits for the tick, since they are never shown again.
 */
export function RecoveryCodes({
  codes,
  email,
  branding,
  onContinue,
}: Readonly<{
  codes: string[];
  email?: string;
  branding?: Branding;
  onContinue: () => void | Promise<void>;
}>) {
  const { t } = useTranslation("signIn");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  function copy() {
    void navigator.clipboard?.writeText(codes.join("\n")).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function download() {
    const blob = new Blob([`${codes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = email ? `qeet-id-recovery-codes-${email}.txt` : "qeet-id-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <HostedPage branding={branding} title={t("mfa.codes.title")} description={t("mfa.codes.body")}>
      <FormStack>
        <ol
          aria-label={t("mfa.codes.list")}
          className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-surface border border-border-default bg-surface-default px-5 py-4"
        >
          {codes.map((c) => (
            <li key={c}>
              <Text size="md" mono>
                {c}
              </Text>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="soft" size="lg" fullWidth onClick={copy}>
            {copied ? t("mfa.codes.copied") : t("mfa.codes.copy")}
          </Button>
          <Button type="button" variant="ghost" size="lg" fullWidth onClick={download}>
            {t("mfa.codes.download")}
          </Button>
        </div>
        <span role="status" className="sr-only">
          {copied ? t("mfa.codes.copied") : ""}
        </span>
        <Checkbox
          label={t("mfa.codes.saved")}
          checked={saved}
          onCheckedChange={(checked) => setSaved(checked === true)}
        />
        <Button
          type="button"
          size="lg"
          fullWidth
          icon={ArrowRightIcon}
          disabled={!saved}
          onClick={onContinue}
        >
          {t("mfa.codes.continue")}
        </Button>
      </FormStack>
    </HostedPage>
  );
}
