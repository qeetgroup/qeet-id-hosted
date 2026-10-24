"use client";

import { FingerprintPatternIcon } from "@qeetrix/icons";
import { Alert, AlertDescription, Button, Input, Spinner } from "@qeetrix/ui";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/platform/api/client";
import { AuthCard } from "@/platform/components/auth-card";
import { FormAlert } from "@/platform/components/form-alert";
import {
  addPasskey,
  listPasskeys,
  PASSKEY_NAME_MAX_LENGTH,
  type Passkey,
  type PasskeyList,
  passkeyErrorKey,
  passkeysSupported,
  renamePasskey,
} from "@/platform/webauthn/passkeys";

import { PasskeyRow } from "./passkey-row";

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
        err instanceof ApiError && err.status === 401
          ? { status: "signedOut" }
          : { status: "error" },
      );
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: loads once on opening
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
        <p
          role="status"
          className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
        >
          <Spinner size="sm" /> {t("loading")}
        </p>
      </AuthCard>
    );
  }

  if (state.status === "signedOut") {
    return (
      <AuthCard title={t("signedOut.title")} subtitle={t("signedOut.body")}>
        <FormAlert>{error}</FormAlert>
        <Button render={<a href="/sign-in" />} size="lg" className="w-full">
          {t("signedOut.action")}
        </Button>
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
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
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
            <FingerprintPatternIcon className="mr-2 size-4" /> {t("add.idle")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
