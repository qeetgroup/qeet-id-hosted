"use client";

import { Button, Input } from "@qeetrix/ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { PASSKEY_NAME_MAX_LENGTH, type Passkey } from "@/platform/webauthn/passkeys";

/** One passkey: its name (rendered as text only), dates, and an inline rename. */
export function PasskeyRow({
  passkey,
  onRename,
  onError,
}: {
  passkey: Passkey;
  onRename: (passkey: Passkey, name: string) => Promise<void>;
  onError: (err: unknown) => void;
}) {
  const { t } = useTranslation("security");
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The backend trims and counts characters; offer Save only for a name it accepts.
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

  const label = passkey.name?.trim();
  const added = t("list.added", { date: new Date(passkey.created_at).toLocaleDateString() });
  const used = passkey.last_used_at
    ? t("list.lastUsed", { date: new Date(passkey.last_used_at).toLocaleDateString() })
    : t("list.neverUsed");

  if (draft !== null) {
    return (
      <li className="p-3">
        <form onSubmit={save} className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setDraft(null);
            }}
            aria-label={t("rename.label")}
            aria-invalid={!valid}
            maxLength={PASSKEY_NAME_MAX_LENGTH}
            autoFocus
          />
          <Button type="submit" size="sm" disabled={!valid || saving}>
            {t("rename.save")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>
            {t("rename.cancel")}
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        {label ? (
          <p className="truncate text-sm font-medium" title={label}>
            {label}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm italic">{t("list.unnamed")}</p>
        )}
        <p className="text-muted-foreground text-xs">
          {added} · {used}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setDraft(passkey.name ?? "")}>
        {t("rename.action")}
      </Button>
    </li>
  );
}
