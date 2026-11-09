"use client";

import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  Text,
} from "@qeetrix/react";
import { CopyField } from "@qeetrix/react/experimental";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FormAlert } from "@/platform/components/form-alert";

/** Asks before something that can't be undone; closed only by its buttons. */
function ConfirmDialog({
  title,
  body,
  confirm,
  busyLabel,
  cancel,
  failed,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirm: string;
  busyLabel: string;
  cancel: string;
  /** What to say when it didn't work: a title and a body. */
  failed?: [string, string];
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function run() {
    setError(false);
    setBusy(true);
    const ok = await onConfirm();
    setBusy(false);
    if (ok) onClose();
    else setError(true);
  }
  return (
    <Dialog open intent="danger" onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={title} description={body}>
        {error && failed && (
          <DialogBody>
            <FormAlert title={failed[0]}>{failed[1]}</FormAlert>
          </DialogBody>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={busy} />}>{cancel}</DialogClose>
          <Button tone="danger" loading={busy} onClick={() => void run()}>
            {busy ? busyLabel : confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Removing the connection says who it affects; the dialog's only red button removes it. */
export function RemoveConnectionDialog({
  name,
  idpName,
  domain,
  onRemove,
  onClose,
}: {
  name: string;
  idpName: string;
  domain?: string;
  onRemove: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useTranslation("enterpriseSetup");
  return (
    <ConfirmDialog
      title={t("removeConnection.title", { name })}
      body={
        domain
          ? t("removeConnection.body", { domain, idp: idpName })
          : t("removeConnection.bodyNoDomain", { idp: idpName })
      }
      confirm={t("removeConnection.remove")}
      busyLabel={t("removeConnection.removing")}
      cancel={t("removeConnection.cancel")}
      failed={[t("removeConnection.failedTitle"), t("removeConnection.failedBody")]}
      onConfirm={onRemove}
      onClose={onClose}
    />
  );
}

/** Turning SCIM off revokes the token; it says what stops, and that nobody is removed. */
export function TurnOffScimDialog({
  idpName,
  orgName,
  onTurnOff,
  onClose,
}: {
  idpName: string;
  orgName: string;
  onTurnOff: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useTranslation("enterpriseSetup");
  return (
    <ConfirmDialog
      title={t("turnOffScim.title")}
      body={t("turnOffScim.body", { idp: idpName, org: orgName })}
      confirm={t("turnOffScim.turnOff")}
      busyLabel={t("turnOffScim.turningOff")}
      cancel={t("turnOffScim.cancel")}
      onConfirm={onTurnOff}
      onClose={onClose}
    />
  );
}

/**
 * The SCIM bearer token, shown once and never again: the dialog says so and waits for the tick
 * before it closes. Turned on for the first time, the endpoint comes with it, as the identity
 * provider asks for both.
 */
export function ScimTokenDialog({
  token,
  endpoint,
  first,
  idpName,
  onClose,
}: {
  token: string;
  endpoint?: string;
  first: boolean;
  idpName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation("enterpriseSetup");
  const [saved, setSaved] = useState(false);
  return (
    <Dialog open dismissible={false} onOpenChange={(open) => !open && saved && onClose()}>
      <DialogContent
        size="md"
        title={first ? t("scimToken.firstTitle") : t("scimToken.newTitle")}
        description={t("scimToken.body")}
      >
        <DialogBody>
          <div className="flex flex-col gap-4">
            <Text size="md" render={<p />}>
              {first
                ? t("scimToken.firstBody", { idp: idpName })
                : t("scimToken.newBody", { idp: idpName })}
            </Text>
            {first && endpoint && (
              <CopyField label={t("scimToken.endpoint")} value={endpoint} wrap="anywhere" />
            )}
            <CopyField label={t("scimToken.token")} value={token} wrap="anywhere" />
            <Checkbox
              label={t("scimToken.saved")}
              checked={saved}
              onCheckedChange={(checked) => setSaved(checked === true)}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button disabled={!saved} onClick={onClose}>
            {t("scimToken.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
