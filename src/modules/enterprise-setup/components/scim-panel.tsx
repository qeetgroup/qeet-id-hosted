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
import {
  getScimConfig,
  revokeScimToken,
  rotateScimToken,
  type ScimConfig,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";

export function ScimPanel() {
  const [config, setConfig] = useState<ScimConfig | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = () => {
    getScimConfig()
      .then(setConfig)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Failed to load."));
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
      setErr(e instanceof ApiError ? e.message : "Rotate failed.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm("Disable SCIM provisioning? Your IdP will stop syncing.")) return;
    setBusy(true);
    setErr(null);
    try {
      await revokeScimToken();
      setFreshToken(null);
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Revoke failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SCIM provisioning</CardTitle>
          <CardDescription>
            Point your IdP&rsquo;s SCIM connector at this endpoint and bearer token.
          </CardDescription>
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
                {config.provisioned_count} user(s) provisioned via SCIM.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={rotate}>
                  {config.token_set ? "Roll token" : "Enable SCIM"}
                </Button>
                {config.token_set && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={revoke}>
                    Disable
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
            <CardTitle className="text-base">Your new SCIM bearer token</CardTitle>
            <CardDescription>
              Copy it now — for security it is shown once and cannot be retrieved again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input value={freshToken} readOnly className="font-mono text-xs" />
            <div>
              <Button variant="outline" size="sm" onClick={() => setFreshToken(null)}>
                I&apos;ve saved it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
