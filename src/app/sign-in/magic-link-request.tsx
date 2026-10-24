"use client";

import { Button, Input } from "@qeetrix/ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormAlert } from "@/components/form-alert";
import { ApiError, apiPost } from "@/lib/api";

type MagicLinkRequestProps = {
  tenantId: string;
  returnTo: string;
  initialEmail: string;
  onBack: () => void;
};

/**
 * Asks for a one-time sign-in link for the organisation being signed in to.
 * The link brings the user back here and on to the application. The answer is
 * the same whether or not the address has an account.
 */
export function MagicLinkRequest({
  tenantId,
  returnTo,
  initialEmail,
  onBack,
}: MagicLinkRequestProps) {
  const { t } = useTranslation("signIn");
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/v1/auth/magic-link/start", {
        tenant_id: tenantId,
        email,
        app: "hosted_login",
        return_to: returnTo,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common:errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p role="status" className="text-muted-foreground text-sm">
          {t("magic.sent", { email })}
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={onBack}>
          {t("magic.back")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="magic-email" className="text-sm font-medium">
          {t("fields.email")}
        </label>
        <Input
          id="magic-email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <p className="text-muted-foreground text-xs">{t("magic.hint")}</p>
      </div>
      <FormAlert>{error}</FormAlert>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={loading}
        loadingLabel={t("magic.busy")}
      >
        {t("magic.submit")}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        {t("magic.back")}
      </Button>
    </form>
  );
}
