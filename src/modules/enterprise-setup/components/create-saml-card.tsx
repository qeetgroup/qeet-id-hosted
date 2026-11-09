"use client";

import { Button, Card, Field, Select, Textarea, TextField } from "@qeetrix/react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { createSamlConnection, type SamlStatus } from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";
import { PlusIcon } from "@/platform/icons";

/** Add a SAML connection from the identity provider's values. */
export function CreateSamlCard({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation("enterpriseSetup");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<SamlStatus>("draft");

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
        status: status === "active" ? "active" : "draft",
      });
      formElement.reset();
      setStatus("draft");
      onCreated();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : t("create.failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card title={t("create.title")} level={2} description={t("create.description")}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <TextField label={t("create.name")} name="name" placeholder="Acme Okta" required />
        <div className="grid gap-5 laptop:grid-cols-2">
          <TextField
            label={t("create.entityId")}
            name="idp_entity_id"
            placeholder="http://www.okta.com/exk1abc"
            spellCheck={false}
            required
          />
          <TextField
            label={t("create.ssoUrl")}
            name="idp_sso_url"
            type="url"
            placeholder="https://acme.okta.com/app/…/sso/saml"
            spellCheck={false}
            required
          />
        </div>
        <Field label={t("create.certificate")}>
          {(control) => (
            <Textarea
              {...control}
              name="idp_certificate"
              rows={4}
              spellCheck={false}
              placeholder={t("create.certificatePlaceholder")}
              required
            />
          )}
        </Field>
        <div className="grid gap-5 laptop:grid-cols-2">
          <TextField
            label={t("create.emailAttribute")}
            name="email_attribute"
            optional
            placeholder={t("create.emailAttributePlaceholder")}
          />
          <TextField
            label={t("create.nameAttribute")}
            name="name_attribute"
            optional
            placeholder={t("create.nameAttributePlaceholder")}
          />
        </div>
        <Field label={t("create.status")}>
          {(control) => (
            <Select<SamlStatus>
              aria-labelledby={control["aria-labelledby"]}
              aria-describedby={control["aria-describedby"]}
              value={status}
              onValueChange={(value) => value && setStatus(value)}
              items={[
                { value: "draft", label: t("create.draft") },
                { value: "active", label: t("create.active") },
              ]}
            />
          )}
        </Field>
        <FormAlert title={err} />
        <Button type="submit" icon={PlusIcon} loading={pending} className="self-start">
          {pending ? t("create.submitting") : t("create.submit")}
        </Button>
      </form>
    </Card>
  );
}
