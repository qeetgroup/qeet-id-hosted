"use client";

import { Button, Card, Spinner, Text } from "@qeetrix/react";
import { EmptyState } from "@qeetrix/react/experimental";
import { useTranslation } from "react-i18next";

import { FormAlert } from "@/platform/components/form-alert";
import { KeyRoundIcon, RotateCwIcon } from "@/platform/icons";
import type { Passkey, PasskeyList as Passkeys } from "@/platform/webauthn/passkeys";

import { PasskeyRow } from "./passkey-row";

/** The person's passkeys as the page loads them: loading, failed with a retry, none, or the list. */
export function PasskeysPanel({
  status,
  list,
  onRetry,
  onRename,
  onRemove,
  onError,
}: Readonly<{
  status: "loading" | "error" | "ready";
  list?: Passkeys;
  onRetry: () => void;
  onRename: (passkey: Passkey, name: string) => Promise<void>;
  onRemove: (passkey: Passkey) => void;
  onError: (err: unknown) => void;
}>) {
  const { t } = useTranslation("security");
  if (status === "loading") {
    return (
      <div role="status" className="flex items-center gap-3 py-2">
        <Spinner size="md" tone="brand" decorative />
        <Text size="md" tone="subtle">
          {t("loading")}
        </Text>
      </div>
    );
  }
  if (status === "error" || !list) {
    return (
      <FormAlert
        title={t("loadError.title")}
        actions={
          <Button size="sm" variant="soft" icon={RotateCwIcon} onClick={onRetry}>
            {t("loadError.retry")}
          </Button>
        }
      >
        {t("loadError.body")}
      </FormAlert>
    );
  }
  if (list.items.length === 0) {
    return (
      <Card>
        <EmptyState
          size="section"
          icon={KeyRoundIcon}
          level={2}
          title={t("empty.title")}
          description={t("empty.body")}
        />
      </Card>
    );
  }
  return (
    <ul
      aria-label={t("list.label")}
      className="divide-y divide-border-subtle rounded-surface border border-border-default bg-surface-raised"
    >
      {list.items.map((p) => (
        <PasskeyRow
          key={p.id}
          passkey={p}
          onRename={onRename}
          onRemove={onRemove}
          onError={onError}
        />
      ))}
    </ul>
  );
}
