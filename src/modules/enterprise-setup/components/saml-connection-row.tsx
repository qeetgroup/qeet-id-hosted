"use client";

import { Badge, Button, Text } from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  deleteSamlConnection,
  type SamlConnection,
  type SamlTestResult,
  testSamlConnection,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";
import { CircleAlertIcon, CircleCheckIcon } from "@/platform/icons";

const STATUS_TONE = { active: "success", draft: "neutral", disabled: "warning" } as const;

/** One SAML connection: its name and status, the identity provider's entity ID, Test and Remove. */
export function SamlConnectionRow({
  connection: c,
  onChange,
}: {
  connection: SamlConnection;
  onChange: () => void;
}) {
  const { t } = useTranslation("enterpriseSetup");
  const [testResult, setTestResult] = useState<SamlTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runTest = async () => {
    setBusy(true);
    setErr(null);
    try {
      setTestResult(await testSamlConnection(c.id));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("saml.testFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("saml.confirmDelete", { name: c.name }))) return;
    setBusy(true);
    try {
      await deleteSamlConnection(c.id);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("saml.deleteFailed"));
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <Text size="md" weight="medium">
              {c.name}
            </Text>
            <Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? "neutral"}>
              {t(`saml.status.${c.status}`, { defaultValue: c.status })}
            </Badge>
          </p>
          <Text size="sm" tone="subtle" truncate mono render={<p />}>
            {c.idp_entity_id}
          </Text>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={runTest}>
            {t("saml.test")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            tone="danger"
            size="sm"
            disabled={busy}
            onClick={remove}
          >
            {t("saml.delete")}
          </Button>
        </div>
      </div>
      {testResult && (
        <ul className="rounded-surface border border-border-default px-3 py-2">
          {testResult.checks.map((check) => {
            const CheckIcon = check.ok ? CircleCheckIcon : CircleAlertIcon;
            return (
              <li key={check.name} className="flex items-center gap-2 py-1">
                <CheckIcon
                  size={16}
                  className={check.ok ? "text-icon-success" : "text-icon-danger"}
                />
                <Text size="sm">
                  <span className="sr-only">
                    {check.ok ? t("saml.checkOk") : t("saml.checkFail")}:{" "}
                  </span>
                  {check.name}
                  {check.detail && <span className="text-text-subtle"> · {check.detail}</span>}
                </Text>
              </li>
            );
          })}
        </ul>
      )}
      <FormAlert title={err} />
    </li>
  );
}
