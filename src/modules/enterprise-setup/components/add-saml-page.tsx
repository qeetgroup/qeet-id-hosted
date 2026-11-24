"use client";

import { Button, Card, Field, Radio, RadioGroup, Textarea, TextField } from "@qeetrix/react";
import { FileUpload, type FileUploadItem } from "@qeetrix/react/experimental";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type SamlConnection,
  type SamlStatus,
  updateSamlConnection,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowLeftIcon, CheckIcon } from "@/platform/icons";

import { parseIdpMetadata } from "../metadata";

/**
 * The identity provider's details for the draft connection: its metadata file first (read here, in
 * the browser, so nothing is copied by hand), or each value typed. The certificate is checked by the
 * server before it's saved; a refusal keeps every value. Starts as a draft (tested, not used for
 * sign-in) or active.
 */
export function AddSamlPage({
  connection,
  idpName,
  barEnd,
  branding,
  onSaved,
  onCancel,
}: Readonly<{
  connection: SamlConnection;
  idpName: string;
  barEnd: React.ReactNode;
  branding?: Branding;
  onSaved: (connection: SamlConnection) => void;
  onCancel: () => void;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  const editing = Boolean(connection.idp_entity_id);
  const [name, setName] = useState(connection.name);
  const [entityId, setEntityId] = useState(connection.idp_entity_id);
  const [ssoUrl, setSsoUrl] = useState(connection.idp_sso_url);
  const [certificate, setCertificate] = useState("");
  const [emailAttr, setEmailAttr] = useState(connection.email_attribute);
  const [nameAttr, setNameAttr] = useState(connection.name_attribute);
  const [status, setStatus] = useState<SamlStatus>(
    connection.status === "active" ? "active" : "draft",
  );
  const [file, setFile] = useState<FileUploadItem[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [certError, setCertError] = useState(false);
  const [error, setError] = useState<{ title: string; body?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function readFile(files: File[]) {
    const picked = files[0];
    if (!picked) return;
    setFileError(null);
    const metadata = parseIdpMetadata(await picked.text());
    if (!metadata) {
      setFile([
        {
          id: "m",
          name: picked.name,
          size: picked.size,
          status: "error",
          error: t("addSaml.metadataError"),
        },
      ]);
      setFileError(t("addSaml.metadataError"));
      return;
    }
    setFile([{ id: "m", name: picked.name, size: picked.size, status: "done" }]);
    setEntityId(metadata.entityId);
    setSsoUrl(metadata.ssoUrl);
    setCertificate(metadata.certificate);
  }

  async function save(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCertError(false);
    setSaving(true);
    try {
      const saved = await updateSamlConnection(connection.id, {
        name: name.trim(),
        idp_entity_id: entityId.trim(),
        idp_sso_url: ssoUrl.trim(),
        ...(certificate.trim() ? { idp_certificate: certificate.trim() } : {}),
        email_attribute: emailAttr.trim(),
        name_attribute: nameAttr.trim(),
        status,
      });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.code === "saml.certificate_invalid") setCertError(true);
      else if (err instanceof ApiError && err.status < 500) setError({ title: err.message });
      else setError({ title: t("addSaml.failedTitle"), body: t("addSaml.failedBody") });
      setSaving(false);
    }
  }

  let saveLabel = editing ? t("addSaml.saveView") : t("addSaml.save");
  if (saving) saveLabel = t("addSaml.saving");
  return (
    <HostedPage
      kind="page"
      branding={branding}
      title={
        editing
          ? t("addSaml.titleView", { name: connection.name })
          : t("addSaml.title", { idp: idpName })
      }
      description={t("addSaml.body")}
      barEnd={barEnd}
    >
      <form onSubmit={save} className="flex flex-col gap-6">
        {error && <FormAlert title={error.title}>{error.body}</FormAlert>}
        <Field
          label={t("addSaml.metadata")}
          description={t("addSaml.metadataHint")}
          error={fileError ?? undefined}
        >
          <FileUpload
            accept=".xml,application/xml,text/xml"
            items={file}
            onSelect={(files) => void readFile(files)}
            onRemove={() => setFile([])}
          />
        </Field>
        <Card title={t("addSaml.details")} level={2}>
          <div className="flex flex-col gap-5">
            <TextField
              label={t("addSaml.name")}
              required
              placeholder={t("addSaml.nameHint")}
              description={t("addSaml.nameHelp")}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <TextField
              label={t("addSaml.entity")}
              required
              spellCheck={false}
              placeholder={t("addSaml.entityHint")}
              value={entityId}
              onChange={(e) => setEntityId(e.currentTarget.value)}
            />
            <TextField
              label={t("addSaml.sso")}
              required
              type="url"
              spellCheck={false}
              placeholder={t("addSaml.ssoHint")}
              value={ssoUrl}
              onChange={(e) => setSsoUrl(e.currentTarget.value)}
            />
            <Field
              label={t("addSaml.cert")}
              invalid={certError}
              error={certError ? t("addSaml.certError") : undefined}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={4}
                  required={!editing}
                  spellCheck={false}
                  className="font-mono"
                  placeholder={t("addSaml.certHint")}
                  value={certificate}
                  onValueChange={(value) => setCertificate(String(value))}
                />
              )}
            </Field>
            <div className="flex flex-col gap-5 laptop:grid laptop:grid-cols-2">
              <TextField
                label={t("addSaml.email")}
                optional
                placeholder={t("addSaml.emailHint")}
                description={t("addSaml.emailHelp")}
                value={emailAttr}
                onChange={(e) => setEmailAttr(e.currentTarget.value)}
              />
              <TextField
                label={t("addSaml.display")}
                optional
                placeholder={t("addSaml.displayHint")}
                value={nameAttr}
                onChange={(e) => setNameAttr(e.currentTarget.value)}
              />
            </div>
            <RadioGroup<SamlStatus>
              label={t("addSaml.status")}
              value={status}
              onValueChange={(value) => setStatus(value)}
            >
              <Radio<SamlStatus>
                value="draft"
                label={t("addSaml.draft")}
                description={t("addSaml.draftHelp")}
              />
              <Radio<SamlStatus>
                value="active"
                label={t("addSaml.active")}
                description={t("addSaml.activeHelp")}
              />
            </RadioGroup>
          </div>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" icon={CheckIcon} loading={saving}>
            {saveLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            icon={ArrowLeftIcon}
            disabled={saving}
            onClick={onCancel}
          >
            {t("addSaml.cancel")}
          </Button>
        </div>
      </form>
    </HostedPage>
  );
}
