"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  StatusPill,
} from "@qeetrix/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getScimConfig,
  revokeScimToken,
  rotateScimToken,
  type ScimConfig,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";

export function ScimPanel() {
  const { t } = useTranslation("enterpriseSetup");
  const [config, setConfig] = useState<ScimConfig | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = () => {
    getScimConfig()
      .then(setConfig)
      .catch((e) => setErr(e instanceof ApiError ? e.message : t("scim.loadFailed")));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loads once on opening
  useEffect(() => {
    reload();
  }, []);

  const rotate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await rotateScimToken();
      setFreshToken(res.token);
      setConfig(res.config);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("scim.rotateFailed"));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm(t("scim.confirmDisable"))) return;
    setBusy(true);
    setErr(null);
    try {
      await revokeScimToken();
      setFreshToken(null);
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("scim.revokeFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("scim.title")}</CardTitle>
          <CardDescription>{t("scim.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {config === null ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <StatusPill status={config.token_set ? "active" : "disabled"} />
                {config.token_set && config.token_prefix && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {config.token_prefix}…
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("scim.provisioned", { count: config.provisioned_count })}
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={rotate}>
                  {config.token_set ? t("scim.roll") : t("scim.enable")}
                </Button>
                {config.token_set && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={revoke}>
                    {t("scim.disable")}
                  </Button>
                )}
              </div>
            </>
          )}
          <FormAlert>{err}</FormAlert>
        </CardContent>
      </Card>

      {freshToken && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">{t("scim.newToken")}</CardTitle>
            <CardDescription>{t("scim.newTokenBody")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input value={freshToken} readOnly className="font-mono text-xs" />
            <div>
              <Button variant="outline" size="sm" onClick={() => setFreshToken(null)}>
                {t("scim.saved")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
