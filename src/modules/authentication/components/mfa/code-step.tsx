"use client";

import { Button, Checkbox, Text, TextField } from "@qeetrix/react";
import { OTPInput } from "@qeetrix/react/experimental";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormStack } from "@/platform/components/form-parts";
import { ArrowRightIcon } from "@/platform/icons";

/**
 * A code for the second step: six digits from an authenticator app or a message (verified as soon
 * as the sixth is typed), or a recovery code. A wrong code keeps the digits and says what to check.
 * Don't ask again on this device is offered when the organisation remembers devices.
 */
export function CodeStep({
  kind,
  wrong,
  busy,
  rememberEnabled,
  rememberDays,
  remember,
  onRemember,
  onVerify,
  children,
}: {
  kind: "app" | "sent" | "recovery";
  /** What to say at the field after a wrong code; nothing when the last code wasn't wrong. */
  wrong: string | null;
  busy: boolean;
  rememberEnabled: boolean;
  /** How long the organisation remembers a device, when known. */
  rememberDays?: number;
  remember: boolean;
  onRemember: (remember: boolean) => void;
  onVerify: (code: string) => void;
  /** Under Verify: send another code, try another way. */
  children?: ReactNode;
}) {
  const { t } = useTranslation("signIn");
  const [code, setCode] = useState("");
  const [empty, setEmpty] = useState(false);
  const labelId = useId();
  const message = empty ? t(kind === "recovery" ? "mfa.emptyRecovery" : "mfa.empty") : wrong;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmpty(!code.trim());
    if (code.trim()) onVerify(code.trim());
  }

  return (
    <form onSubmit={submit}>
      <FormStack>
        {kind === "recovery" ? (
          <TextField
            label={t("mfa.recoveryLabel")}
            required
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={t("mfa.recoveryHint")}
            description={t("mfa.recoveryHelp")}
            invalid={Boolean(message)}
            error={message ?? undefined}
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
          />
        ) : (
          <div>
            <Text size="sm" weight="medium" tone="subtle" render={<p id={labelId} />}>
              {t("mfa.code")}
            </Text>
            <OTPInput
              length={6}
              groups={[3, 3]}
              size="lg"
              autoFocus
              autoComplete="one-time-code"
              disabled={busy}
              value={code}
              onValueChange={setCode}
              onValueComplete={(value) => onVerify(value)}
              aria-labelledby={labelId}
              aria-invalid={message ? true : undefined}
              className="mt-1.5"
            />
            {message && (
              <Text size="sm" className="mt-2 text-text-danger" render={<p role="alert" />}>
                {message}
              </Text>
            )}
          </div>
        )}
        {rememberEnabled && (
          <Checkbox
            label={rememberDays ? t("mfa.rememberDays", { days: rememberDays }) : t("mfa.remember")}
            checked={remember}
            onCheckedChange={(checked) => onRemember(checked === true)}
          />
        )}
        <Button type="submit" size="lg" fullWidth icon={ArrowRightIcon} loading={busy}>
          {busy ? t("mfa.verifying") : t("mfa.verify")}
        </Button>
        {children}
      </FormStack>
    </form>
  );
}
