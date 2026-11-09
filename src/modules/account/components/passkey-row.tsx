"use client";

import { Button, IconButton, Text, TextField } from "@qeetrix/react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckIcon, KeyRoundIcon, PencilIcon } from "@/platform/icons";
import { PASSKEY_NAME_MAX_LENGTH, type Passkey } from "@/platform/webauthn/passkeys";

/**
 * One passkey on a ruled row: its name (the browser's or the person's, rendered as text only), when
 * it was added and last used, and Rename as an icon button with its name as a tooltip. Rename edits
 * the row in place.
 */
export function PasskeyRow({
  passkey,
  onRename,
  onError,
}: {
  passkey: Passkey;
  onRename: (passkey: Passkey, name: string) => Promise<void>;
  onError: (err: unknown) => void;
}) {
  const { t, i18n } = useTranslation("security");
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = passkey.name?.trim() || t("list.unnamed");
  const date = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(iso),
    );

  // The server trims and counts characters; offer Save only for a name it accepts.
  const trimmed = draft?.trim() ?? "";
  const valid = trimmed.length > 0 && Array.from(trimmed).length <= PASSKEY_NAME_MAX_LENGTH;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onRename(passkey, trimmed);
      setDraft(null);
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  if (draft !== null) {
    return (
      <li className="px-4 py-4">
        <form onSubmit={save} className="flex flex-col gap-3">
          <TextField
            label={t("rename.label")}
            autoFocus
            maxLength={PASSKEY_NAME_MAX_LENGTH}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" icon={CheckIcon} loading={saving} disabled={!valid}>
              {t("rename.save")}
            </Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setDraft(null)}>
              {t("rename.cancel")}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-3 ps-4 pe-2">
      <KeyRoundIcon size={20} className="shrink-0 text-icon-subtle" />
      <div className="min-w-0 flex-1">
        <Text size="md" weight="medium" truncate render={<p />}>
          {label}
        </Text>
        <Text size="sm" tone="subtle" render={<p />}>
          {t("list.added", { date: date(passkey.created_at) })}
          <br className="tablet:hidden" />
          <span className="hidden tablet:inline"> · </span>
          {passkey.last_used_at
            ? t("list.lastUsed", { date: date(passkey.last_used_at) })
            : t("list.neverUsed")}
        </Text>
      </div>
      <IconButton
        variant="ghost"
        tone="neutral"
        icon={PencilIcon}
        aria-label={t("rename.actionFor", { name: label })}
        tooltip={t("rename.action")}
        onClick={() => setDraft(passkey.name ?? "")}
      />
    </li>
  );
}
