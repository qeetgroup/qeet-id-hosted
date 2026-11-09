"use client";

import { Card, Spinner, Text } from "@qeetrix/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  listSamlConnections,
  type SamlConnection,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";

import { CreateSamlCard } from "./create-saml-card";
import { SamlConnectionRow } from "./saml-connection-row";

/** The organisation's SAML connections, each testable and removable, and a form to add one. */
export function SamlPanel() {
  const { t } = useTranslation("enterpriseSetup");
  const [connections, setConnections] = useState<SamlConnection[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = () => {
    listSamlConnections()
      .then((res) => setConnections(res.items))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : t("saml.loadFailed")));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loads once on opening
  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Card title={t("saml.title")} level={2} description={t("saml.description")}>
        <FormAlert title={loadError} />
        {connections === null && !loadError ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" tone="brand" label={t("saml.title")} />
          </div>
        ) : connections && connections.length === 0 ? (
          <Text size="md" tone="subtle" render={<p />}>
            {t("saml.empty")}
          </Text>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {(connections ?? []).map((c) => (
              <SamlConnectionRow key={c.id} connection={c} onChange={reload} />
            ))}
          </ul>
        )}
      </Card>
      <CreateSamlCard onCreated={reload} />
    </div>
  );
}
