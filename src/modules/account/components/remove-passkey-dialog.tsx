"use client";

import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@qeetrix/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FormAlert } from "@/platform/components/form-alert";

/**
 * Asks before removing a passkey: a destructive dialog, closed only by its buttons, that says what
 * changes and to delete it from the device too. A refusal stays in the dialog with its reason.
 */
export function RemovePasskeyDialog({
  name,
  onRemove,
  onClose,
}: Readonly<{
  name: string;
  /** Removes it; a thrown message stays in the dialog. */
  onRemove: () => Promise<string | null>;
  onClose: () => void;
}>) {
  const { t } = useTranslation("security");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(await onRemove());
    setBusy(false);
  }

  return (
    <Dialog open intent="danger" onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={t("remove.title", { name })} description={t("remove.body")}>
        {error && (
          <DialogBody>
            <FormAlert title={error} />
          </DialogBody>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={busy} />}>
            {t("remove.cancel")}
          </DialogClose>
          <Button tone="danger" loading={busy} onClick={() => void remove()}>
            {busy ? t("remove.busy") : t("remove.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
