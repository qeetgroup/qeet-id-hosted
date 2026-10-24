"use client";

import { FingerprintPatternIcon } from "@qeetrix/icons";
import { Button } from "@qeetrix/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import type { Branding } from "@/lib/branding";
import { addPasskey, passkeyErrorKey } from "@/lib/passkeys";

/**
 * The "add a passkey" offer shown after a password sign-in, before the browser
 * continues to the application. "Not now" (or a failure the user gives up on)
 * continues exactly as sign-in would have; adding one continues once it is
 * saved. The passkey is named after this browser and can be renamed on the
 * security page.
 */
export function PasskeyPrompt({
  branding,
  onContinue,
}: {
  branding?: Branding;
  onContinue: () => void;
}) {
  const { t } = useTranslation("security");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    setBusy(true);
    try {
      await addPasskey("");
      onContinue();
    } catch (err) {
      setError(t(passkeyErrorKey(err)));
      setBusy(false);
    }
  }

  return (
    <AuthCard branding={branding} title={t("prompt.title")} subtitle={t("prompt.body")}>
      <FormAlert>{error}</FormAlert>
      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          onClick={add}
          loading={busy}
          loadingLabel={t("prompt.busy")}
        >
          <FingerprintPatternIcon className="mr-2 size-4" /> {t("prompt.add")}
        </Button>
        <Button variant="ghost" size="lg" className="w-full" disabled={busy} onClick={onContinue}>
          {t("prompt.skip")}
        </Button>
      </div>
    </AuthCard>
  );
}
