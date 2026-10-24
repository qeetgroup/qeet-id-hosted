"use client";

import { FingerprintPatternIcon } from "@qeetrix/icons";
import { Alert, AlertDescription, Button, buttonVariants, Input, Spinner } from "@qeetrix/ui";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-alert";
import { ApiError } from "@/lib/api";
import {
  addPasskey,
  listPasskeys,
  PASSKEY_NAME_MAX_LENGTH,
  type Passkey,
  type PasskeyList,
  passkeyErrorKey,
  passkeysSupported,
  renamePasskey,
} from "@/lib/passkeys";

type State =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "error" }
  | { status: "ready"; list: PasskeyList };

/**
 * Lists the signed-in user's passkeys (rename inline) and adds new ones, as
 * long as their organization allows passkeys. Signed-in means the hosted-login
 * session cookie: a 401 from the list shows the sign-in link instead. Sign-in
 * with no application to return to comes back to this page.
 */
export function SecurityView() {
  const { t } = useTranslation("security");
  const [state, setState] = useState<State>({ status: "loading" });
  const [supported, setSupported] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setState({ status: "ready", list: await listPasskeys() });
    } catch (err) {
      setState(
        err instanceof ApiError && err.status === 401 ? { status: "signedOut" } : { status: "error" },
      );
    }
  }

  useEffect(() => {
    setSupported(passkeysSupported());
    void load();
  }, []);

  // A call that finds the session gone swaps the page for the sign-in link.
  function fail(err: unknown) {
    const key = passkeyErrorKey(err);
    if (key === "errors.signedOut") setState({ status: "signedOut" });
    setError(t(key));
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setAdding(true);
    try {
      await addPasskey(name);
      setName("");
      setNotice(t("add.added"));
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setAdding(false);
    }
  }

  async function onRename(passkey: Passkey, newName: string) {
    setError(null);
    setNotice(null);
    await renamePasskey(passkey.id, newName);
    setNotice(t("rename.saved"));
    await load();
  }

  if (state.status === "loading") {
    return (
      <AuthCard title={t("title")}>
        <p role="status" className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
          <Spinner size="sm" /> {t("loading")}
        </p>
      </AuthCard>
    );
  }

  if (state.status === "signedOut") {
    return (
      <AuthCard title={t("signedOut.title")} subtitle={t("signedOut.body")}>
        <FormAlert>{error}</FormAlert>
        <a href="/sign-in" className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("signedOut.action")}
        </a>
      </AuthCard>
    );
  }

  if (state.status === "error") {
    return (
      <AuthCard title={t("title")}>
        <FormAlert>{t("errors.load")}</FormAlert>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => {
            setState({ status: "loading" });
            void load();
          }}
        >
          {t("retry")}
        </Button>
      </AuthCard>
    );
  }

  const { items, enrollment_allowed: enrollmentAllowed } = state.list;
  return (
    <AuthCard className="max-w-md" title={t("title")} subtitle={t("subtitle")}>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">{t("list.empty")}</p>
      ) : (
        <ul className="divide-border/60 divide-y rounded-md border">
          {items.map((p) => (
            <PasskeyRow key={p.id} passkey={p} onRename={onRename} onError={fail} />
          ))}
        </ul>
      )}

      {notice ? (
        <Alert variant="success" role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <FormAlert>{error}</FormAlert>

      {!enrollmentAllowed ? (
        <p role="status" className="text-muted-foreground text-center text-sm">
          {t("disabled")}
        </p>
      ) : !supported ? (
        <p role="status" className="text-muted-foreground text-center text-sm">
          {t("unsupported")}
        </p>
      ) : (
        <form onSubmit={onAdd} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="passkey-name" className="text-sm font-medium">
              {t("add.nameLabel")}
            </label>
            <Input
              id="passkey-name"
              type="text"
              autoComplete="off"
              maxLength={PASSKEY_NAME_MAX_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("add.namePlaceholder")}
              aria-describedby="passkey-name-hint"
            />
            <p id="passkey-name-hint" className="text-muted-foreground text-xs">
              {t("add.nameHint")}
            </p>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={adding}
            loadingLabel={t("add.busy")}
          >
            <>
              <FingerprintPatternIcon className="mr-2 size-4" /> {t("add.idle")}
            </>
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

/** One passkey: its name (rendered as text only), dates, and an inline rename. */
function PasskeyRow({
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
