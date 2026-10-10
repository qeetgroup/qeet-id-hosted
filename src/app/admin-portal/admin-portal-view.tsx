"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@qeetrix/ui";
import { type FormEvent, useEffect, useState } from "react";

import { FormAlert } from "@/components/form-alert";
import {
  createSamlConnection,
  deleteSamlConnection,
  getScimConfig,
  listSamlConnections,
  type PortalContext,
  revokeScimToken,
  rotateScimToken,
  type SamlConnection,
  type SamlTestResult,
  type ScimConfig,
  testSamlConnection,
} from "@/lib/admin-portal";
import { ApiError } from "@/lib/api";

type Props = {
  context: PortalContext;
};

export function AdminPortalView({ context }: Props) {
  const hasSaml = context.capabilities.includes("saml");
  const hasScim = context.capabilities.includes("scim");
  const defaultTab = hasSaml ? "saml" : "scim";

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configure SSO for {context.tenant_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          This link expires {new Date(context.expires_at).toLocaleString()}. You can return to it
          until then.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {hasSaml && <TabsTrigger value="saml">SAML</TabsTrigger>}
          {hasScim && <TabsTrigger value="scim">SCIM</TabsTrigger>}
        </TabsList>
        {hasSaml && (
          <TabsContent value="saml">
            <SamlPanel />
          </TabsContent>
        )}
        {hasScim && (
          <TabsContent value="scim">
            <ScimPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SamlPanel() {
  const [connections, setConnections] = useState<SamlConnection[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = () => {
    listSamlConnections()
      .then((res) => setConnections(res.items))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load."));
  };

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

function SamlConnectionRow({
  connection: c,
  onChange,
}: {
  connection: SamlConnection;
  onChange: () => void;
}) {
  const [testResult, setTestResult] = useState<SamlTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runTest = async () => {
    setBusy(true);
    setErr(null);
    try {
      setTestResult(await testSamlConnection(c.id));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Test failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the "${c.name}" connection?`)) return;
    setBusy(true);
    try {
      await deleteSamlConnection(c.id);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Delete failed.");
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
            Test
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
      {testResult && (
        <ul className="rounded-md border p-2 text-xs">
          {testResult.checks.map((check) => (
            <li key={check.name} className="flex items-center gap-2 py-0.5">
              <Badge variant={check.ok ? "outline" : "destructive"} className="shrink-0">
                {check.ok ? "OK" : "Fail"}
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

function CreateSamlCard({ onCreated }: { onCreated: () => void }) {
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setErr(null);
    try {
      await createSamlConnection({
        name: String(form.get("name") ?? ""),
        idp_entity_id: String(form.get("idp_entity_id") ?? ""),
        idp_sso_url: String(form.get("idp_sso_url") ?? ""),
        idp_certificate: String(form.get("idp_certificate") ?? ""),
        email_attribute: String(form.get("email_attribute") ?? ""),
        name_attribute: String(form.get("name_attribute") ?? ""),
        status: form.get("status") === "active" ? "active" : "draft",
      });
      formElement.reset();
      onCreated();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Could not create the connection.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a connection</CardTitle>
        <CardDescription>
          Enter the details from your identity provider (Okta, Entra ID, Google Workspace, …).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="name">Connection name</FieldLabel>
            <Input id="name" name="name" placeholder="Acme — Okta" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="idp_entity_id">IdP entity ID / issuer</FieldLabel>
            <Input
              id="idp_entity_id"
              name="idp_entity_id"
              placeholder="http://www.okta.com/exk1abc"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="idp_sso_url">IdP SSO URL</FieldLabel>
            <Input
              id="idp_sso_url"
              name="idp_sso_url"
              placeholder="https://acme.okta.com/app/.../sso/saml"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="idp_certificate">IdP signing certificate</FieldLabel>
            <Textarea
              id="idp_certificate"
              name="idp_certificate"
              rows={4}
              placeholder="-----BEGIN CERTIFICATE----- … or bare base64 from IdP metadata"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email_attribute">Email attribute</FieldLabel>
            <Input
              id="email_attribute"
              name="email_attribute"
              placeholder="email (blank = use NameID)"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="name_attribute">Display-name attribute</FieldLabel>
            <Input id="name_attribute" name="name_attribute" placeholder="displayName (optional)" />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">Initial status</FieldLabel>
            <Select name="status" defaultValue="draft">
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (not yet live)</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <FormAlert>{err}</FormAlert>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add connection"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ScimPanel() {
  const [config, setConfig] = useState<ScimConfig | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = () => {
    getScimConfig()
      .then(setConfig)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Failed to load."));
  };

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
