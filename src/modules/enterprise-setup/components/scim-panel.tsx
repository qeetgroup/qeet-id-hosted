"use client";

import { Badge, Button, Card, Spinner, Text } from "@qeetrix/react";
import { CopyField } from "@qeetrix/react/experimental";
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

/**
 * SCIM provisioning: whether a token is set, how many people it has provisioned, a new token
 * (shown once, never again), and turning it off.
 */
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
    <div className="flex flex-col gap-6">
      <Card title={t("scim.title")} level={2} description={t("scim.description")}>
        <div className="flex flex-col gap-4">
          <FormAlert title={err} />
          {config === null && !err ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" tone="brand" label={t("scim.title")} />
            </div>
          ) : config ? (
            <>
              <div className="flex items-center gap-2">
                <Badge tone={config.token_set ? "success" : "neutral"}>
                  {config.token_set ? t("scim.on") : t("scim.off")}
                </Badge>
                {config.token_set && config.token_prefix && (
                  <Text size="sm" tone="subtle" mono>
                    {config.token_prefix}…
                  </Text>
                )}
              </div>
              <Text size="sm" tone="subtle" render={<p />}>
                {t("scim.provisioned", { count: config.provisioned_count })}
              </Text>
              <div className="flex gap-2">
                <Button type="button" size="sm" loading={busy} onClick={rotate}>
                  {config.token_set ? t("scim.roll") : t("scim.enable")}
                </Button>
                {config.token_set && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    tone="danger"
                    disabled={busy}
                    onClick={revoke}
                  >
                    {t("scim.disable")}
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </Card>

      {freshToken && (
        <Card title={t("scim.newToken")} level={2} description={t("scim.newTokenBody")}>
          <div className="flex flex-col gap-4">
            <CopyField label={t("scim.tokenLabel")} value={freshToken} wrap="anywhere" />
            <Button
              type="button"
              variant="soft"
              size="sm"
              className="self-start"
              onClick={() => setFreshToken(null)}
            >
              {t("scim.saved")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
