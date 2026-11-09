"use client";

import { Avatar, Button, Card, LinkButton, Spinner, Text, TextField } from "@qeetrix/react";
import { EmptyState } from "@qeetrix/react/experimental";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { type Account, fetchSignedInAccount } from "@/platform/api/account";
import { ApiError, apiDelete } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";
import { HostedPage } from "@/platform/components/hosted-page";
import { KeyRoundIcon, LogInIcon, PlusIcon, RotateCwIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";
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
 * The account's passkeys, on a page of its own: the top bar carries the account and Sign out. Each
 * passkey with when it was added and last used, renamed in place; and Add a passkey for this
 * device, unless the organisation turned passkeys off or the browser can't make one. Signed in
 * means the hosted login session cookie; without it, the page says to sign in first, and sign-in
 * with no application to return to comes back here.
 */
export function SecurityView() {
  const { t } = useTranslation("security");
  const [state, setState] = useState<State>({ status: "loading" });
  const [account, setAccount] = useState<Account | null>(null);
  const [supported, setSupported] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setState({ status: "ready", list: await listPasskeys() });
    } catch (err) {
      setState(
        err instanceof ApiError && err.status === 401 ? { status: "signedOut" } : { status: "error" },
      );
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: loads once on opening
  useEffect(() => {
    setSupported(passkeysSupported());
    void load();
    void fetchSignedInAccount().then(setAccount);
  }, []);

  // A call that finds the session gone swaps the page for the sign-in one.
  function fail(err: unknown) {
    const key = passkeyErrorKey(err);
    if (key === "errors.signedOut") setState({ status: "signedOut" });
    setError(t(key));
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAdded(false);
    setAdding(true);
    try {
      await addPasskey(name);
      setName("");
      setAdded(true);
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setAdding(false);
    }
  }

  async function onRename(passkey: Passkey, newName: string) {
    setError(null);
    const saved = await renamePasskey(passkey.id, newName);
    setState((s) =>
      s.status === "ready"
        ? {
            ...s,
            list: { ...s.list, items: s.list.items.map((p) => (p.id === passkey.id ? { ...p, ...saved } : p)) },
          }
        : s,
    );
  }

  // Signs this browser out of the hosted login, then out of each application on the signed-out page.
  async function signOut() {
    try {
      const res = await apiDelete<{ frontchannel_logout_uris?: string[] } | undefined>("/v1/auth/session");
      const q = new URLSearchParams();
      for (const uri of res?.frontchannel_logout_uris ?? []) q.append("frontchannel_logout", uri);
      goTo(`/sign-out/done${q.size ? `?${q.toString()}` : ""}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("signIn:problems.generic.title"));
    }
  }

  if (state.status === "signedOut") {
    return (
      <HostedPage kind="page" title={t("title")} description={t("body")}>
        <EmptyState
          icon={KeyRoundIcon}
          title={t("signedOut.title")}
          description={t("signedOut.body")}
          level={2}
          actions={
            <LinkButton href="/sign-in" icon={LogInIcon}>
              {t("signedOut.action")}
            </LinkButton>
          }
        />
      </HostedPage>
    );
  }

  const bar = account ? (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={account.name || account.email} size="sm" decorative />
      <Text size="md" truncate className="hidden tablet:block">
        {account.name || account.email}
      </Text>
      <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
        {t("signOut")}
      </Button>
    </div>
  ) : undefined;

  return (
    <HostedPage kind="page" title={t("title")} description={t("body")} barEnd={bar}>
      <div className="flex flex-col gap-6">
        <FormAlert title={error} />
        {added && (
          <FormAlert tone="success" title={t("add.addedTitle")}>
            {t("add.addedBody")}
          </FormAlert>
        )}
        {state.status === "loading" ? (
          <div role="status" className="flex items-center gap-3 py-2">
            <Spinner size="md" tone="brand" decorative />
            <Text size="md" tone="subtle">
              {t("loading")}
            </Text>
          </div>
        ) : state.status === "error" ? (
          <FormAlert
            title={t("loadError.title")}
            actions={
              <Button size="sm" variant="soft" icon={RotateCwIcon} onClick={() => void load()}>
                {t("loadError.retry")}
              </Button>
            }
          >
            {t("loadError.body")}
          </FormAlert>
        ) : state.list.items.length === 0 ? (
          <Card>
            <EmptyState
              size="section"
              icon={KeyRoundIcon}
              level={2}
              title={t("empty.title")}
              description={t("empty.body")}
            />
          </Card>
        ) : (
          <ul
            aria-label={t("list.label")}
            className="divide-y divide-border-subtle rounded-surface border border-border-default bg-surface-raised"
          >
            {state.list.items.map((p) => (
              <PasskeyRow key={p.id} passkey={p} onRename={onRename} onError={fail} />
            ))}
          </ul>
        )}

        {state.status === "ready" &&
          (!state.list.enrollment_allowed ? (
            <FormAlert tone="info" title={t("off.title")}>
              {t("off.body")}
            </FormAlert>
          ) : (
            <Card title={t("add.title")} level={2} description={t("add.body")}>
              {!supported ? (
                <FormAlert tone="warning" title={t("unsupported.title")}>
                  {t("unsupported.body")}
                </FormAlert>
              ) : (
                <form onSubmit={onAdd} className="flex flex-col gap-4">
                  <TextField
                    label={t("add.nameLabel")}
                    optional
                    placeholder={t("add.namePlaceholder")}
                    description={t("add.nameHint")}
                    maxLength={PASSKEY_NAME_MAX_LENGTH}
                    disabled={adding}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                  />
                  <Button
                    type="submit"
                    icon={PlusIcon}
                    size="lg"
                    loading={adding}
                    className="w-full tablet:w-auto tablet:self-start"
                  >
                    {adding ? t("add.busy") : t("add.idle")}
                  </Button>
                </form>
              )}
            </Card>
          ))}
      </div>
    </HostedPage>
  );
}
