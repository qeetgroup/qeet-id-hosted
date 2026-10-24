"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@qeetrix/ui";
import { useEffect, useState } from "react";
import {
  listSamlConnections,
  type SamlConnection,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";

import { CreateSamlCard } from "./create-saml-card";
import { SamlConnectionRow } from "./saml-connection-row";

export function SamlPanel() {
  const [connections, setConnections] = useState<SamlConnection[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = () => {
    listSamlConnections()
      .then((res) => setConnections(res.items))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load."));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loads once on opening
  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connections</CardTitle>
          <CardDescription>Your organization&rsquo;s SAML identity provider(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {connections === null ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connections yet — add one below.</p>
          ) : (
            <ul className="divide-y">
              {connections.map((c) => (
                <SamlConnectionRow key={c.id} connection={c} onChange={reload} />
              ))}
            </ul>
          )}
          <FormAlert>{loadError}</FormAlert>
        </CardContent>
      </Card>

      <CreateSamlCard onCreated={reload} />
    </div>
  );
}
