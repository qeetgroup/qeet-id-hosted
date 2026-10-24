"use client";

import { Badge, Button, StatusPill } from "@qeetrix/ui";
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
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {c.name}
            <StatusPill status={c.status} />
          </p>
          <p className="truncate text-xs text-muted-foreground">{c.idp_entity_id}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={busy} onClick={runTest}>
            {t("saml.test")}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            {t("saml.delete")}
          </Button>
        </div>
      </div>
      {testResult && (
        <ul className="rounded-md border p-2 text-xs">
          {testResult.checks.map((check) => (
            <li key={check.name} className="flex items-center gap-2 py-0.5">
              <Badge variant={check.ok ? "outline" : "destructive"} className="shrink-0">
                {check.ok ? t("saml.checkOk") : t("saml.checkFail")}
              </Badge>
              <span>{check.name}</span>
              {check.detail && <span className="text-muted-foreground">— {check.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      <FormAlert>{err}</FormAlert>
    </li>
  );
}
