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
import { useTranslation } from "react-i18next";
import { createSamlConnection } from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";

export function CreateSamlCard({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation("enterpriseSetup");
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
      setErr(ex instanceof ApiError ? ex.message : t("create.failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("create.title")}</CardTitle>
        <CardDescription>{t("create.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="name">{t("create.name")}</FieldLabel>
            <Input id="name" name="name" placeholder="Acme — Okta" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="idp_entity_id">{t("create.entityId")}</FieldLabel>
            <Input
              id="idp_entity_id"
              name="idp_entity_id"
              placeholder="http://www.okta.com/exk1abc"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="idp_sso_url">{t("create.ssoUrl")}</FieldLabel>
            <Input
              id="idp_sso_url"
              name="idp_sso_url"
              placeholder="https://acme.okta.com/app/.../sso/saml"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="idp_certificate">{t("create.certificate")}</FieldLabel>
            <Textarea
              id="idp_certificate"
              name="idp_certificate"
              rows={4}
              placeholder={t("create.certificatePlaceholder")}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email_attribute">{t("create.emailAttribute")}</FieldLabel>
            <Input
              id="email_attribute"
              name="email_attribute"
              placeholder={t("create.emailAttributePlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="name_attribute">{t("create.nameAttribute")}</FieldLabel>
            <Input
              id="name_attribute"
              name="name_attribute"
              placeholder={t("create.nameAttributePlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">{t("create.status")}</FieldLabel>
            <Select name="status" defaultValue="draft">
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t("create.draft")}</SelectItem>
                <SelectItem value="active">{t("create.active")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <FormAlert>{err}</FormAlert>
          <Button type="submit" disabled={pending}>
            {pending ? t("create.submitting") : t("create.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
