"use client";

import {
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
  Textarea,
} from "@qeetrix/ui";
import { type FormEvent, useState } from "react";
import { createSamlConnection } from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";

export function CreateSamlCard({ onCreated }: { onCreated: () => void }) {
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
