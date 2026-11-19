"use client";

import { Button, LinkButton, Text } from "@qeetrix/react";
import { CopyField, OTPInput, QRCode } from "@qeetrix/react/experimental";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type AppEnrollment,
  completeSecondStep,
  startAppEnrollment,
} from "@/modules/authentication/api/mfa";
import { ApiError } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { AccountChip } from "@/platform/components/account-chip";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { formatDay } from "@/platform/format";
import { ArrowLeftIcon, ArrowRightIcon, ExternalLinkIcon, QrCodeIcon } from "@/platform/icons";

import { RecoveryCodes } from "./recovery-codes";

// A base32 key in groups of four, as an authenticator app asks for it.
function grouped(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

/**
 * When the organisation requires a second step and the account has none: an authenticator app is
 * set up during sign-in. Required now, or by a date the organisation set, until when it can be
 * skipped. From a tablet up the page shows the QR code to scan with the phone; on a phone, which
 * can't scan its own screen, it opens the authenticator app instead (otpauth://). Confirm checks one
 * code before turning it on, so a mistyped key never locks anyone out; then the recovery codes.
 */
export function MfaEnrollment({
  mfaToken,
  dueAt,
  email,
  orgName,
  branding,
  onDone,
}: {
  mfaToken: string;
  dueAt?: string;
  email?: string;
  /** The organisation that requires the second step, when known. */
  orgName?: string;
  branding?: Branding;
  onDone: () => void | Promise<void>;
}) {
  const { t, i18n } = useTranslation("signIn");
  const [app, setApp] = useState<AppEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [wrong, setWrong] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeLabel = useId();
  const due = dueAt ? formatDay(dueAt, i18n.language) : null;
  const dueShort = dueAt ? formatDay(dueAt, i18n.language, false) : null;
  const body = due
    ? orgName
      ? t("mfa.enroll.dueBodyOrg", { org: orgName, date: due })
      : t("mfa.enroll.dueBody", { date: due })
    : orgName
      ? t("mfa.enroll.requiredBodyOrg", { org: orgName })
      : t("mfa.enroll.requiredBody");

  async function attempt(fn: () => Promise<void>) {
    setError(null);
    setWrong(false);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiError && err.code === "mfa.code_invalid") setWrong(true);
      else setError(err instanceof ApiError ? err.message : t("problems.generic.title"));
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    attempt(async () => {
      setApp(await startAppEnrollment(mfaToken));
    });

  const confirm = (value: string) =>
    attempt(async () => {
      const res = await completeSecondStep(mfaToken, { code: value });
      if (res.recovery_codes?.length) {
        setCodes(res.recovery_codes);
        return;
      }
      await onDone();
    });

  const skip = () =>
    attempt(async () => {
      await completeSecondStep(mfaToken, { skip: true });
      await onDone();
    });

  if (codes) {
    return (
      <RecoveryCodes
        codes={codes}
        email={email}
        branding={branding}
        onContinue={() => void onDone()}
      />
    );
  }

  if (!app) {
    return (
      <HostedPage
        single
        branding={branding}
        title={t("mfa.enroll.title")}
        description={body}
        lead={email ? <AccountChip email={email} /> : undefined}
      >
        <FormStack>
          <FormAlert title={error} />
          <Text size="md" render={<p />}>
            {t("mfa.enroll.need")}
          </Text>
          <Button
            type="button"
            size="lg"
            fullWidth
            icon={QrCodeIcon}
            loading={busy}
            onClick={() => void start()}
          >
            {t("mfa.enroll.start")}
          </Button>
          {dueShort && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              fullWidth
              disabled={busy}
              onClick={() => void skip()}
            >
              {t("mfa.enroll.skip", { date: dueShort })}
            </Button>
          )}
        </FormStack>
      </HostedPage>
    );
  }

  return (
    <HostedPage
      branding={branding}
      title={t("mfa.enroll.scanTitle")}
      description={
        <>
          <span className="tablet:hidden">{t("mfa.enroll.phoneBody")}</span>
          <span className="hidden tablet:inline">{t("mfa.enroll.scanBody")}</span>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setEmpty(code.length < 6);
          if (code.length === 6) void confirm(code);
        }}
      >
        <FormStack>
          <FormAlert title={error} />
          {/* A phone can't scan its own screen: it opens the authenticator app instead. */}
          <LinkButton
            href={app.provisioning_url}
            variant="soft"
            size="lg"
            fullWidth
            icon={ExternalLinkIcon}
            className="tablet:hidden"
          >
            {t("mfa.enroll.open")}
          </LinkButton>
          <div className="hidden place-items-center rounded-surface border border-border-default bg-[#ffffff] p-5 tablet:grid">
            <QRCode value={app.provisioning_url} label={t("mfa.enroll.qrLabel")} size={168} />
          </div>
          <CopyField
            label={t("mfa.enroll.key")}
            value={grouped(app.secret)}
            description={email ? t("mfa.enroll.keyHelpFor", { email }) : t("mfa.enroll.keyHelp")}
          />
          <div>
            <Text size="sm" weight="medium" tone="subtle" render={<p id={codeLabel} />}>
              {t("mfa.enroll.code")}
            </Text>
            <OTPInput
              length={6}
              groups={[3, 3]}
              size="lg"
              autoComplete="one-time-code"
              disabled={busy}
              value={code}
              onValueChange={setCode}
              onValueComplete={(value) => void confirm(value)}
              aria-labelledby={codeLabel}
              aria-invalid={wrong || empty ? true : undefined}
              className="mt-1.5"
            />
            {(wrong || empty) && (
              <Text size="sm" className="mt-2 text-text-danger" render={<p role="alert" />}>
                {t(wrong ? "mfa.enroll.wrong" : "mfa.enroll.empty")}
              </Text>
            )}
          </div>
          <Button type="submit" size="lg" fullWidth icon={ArrowRightIcon} loading={busy}>
            {t("mfa.enroll.confirm")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            icon={ArrowLeftIcon}
            disabled={busy}
            onClick={() => {
              setApp(null);
              setCode("");
            }}
          >
            {t("mfa.enroll.back")}
          </Button>
        </FormStack>
      </form>
    </HostedPage>
  );
}
