"use client";

import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  Text,
  TextField,
} from "@qeetrix/react";
import { CopyField } from "@qeetrix/react/experimental";
import { type ReactNode, type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addDomain,
  type PortalDomain,
  verifyDomain,
} from "@/modules/enterprise-setup/api/admin-portal";
import { ApiError } from "@/platform/api/client";
import { FormAlert } from "@/platform/components/form-alert";

type Problem = "taken" | "missing" | { message: string };

/**
 * Proves the organisation owns an email domain, in one dialog with two steps: the domain, then the
 * TXT record to add at the DNS provider (under _qeet-verification., so the domain's own records are
 * untouched), each value with Copy. Verify checks once, when asked; a record not found yet can be
 * checked again later from the same link. A domain another organisation verified can't be claimed.
 */
export function VerifyDomainDialog({
  pending,
  onChanged,
  onClose,
}: Readonly<{
  /** A domain added before and not verified yet: the dialog opens on its record. */
  pending?: PortalDomain;
  onChanged: () => void;
  onClose: () => void;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  const [domain, setDomain] = useState<PortalDomain | null>(pending ?? null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [verified, setVerified] = useState<PortalDomain | null>(null);

  async function add(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setProblem(null);
    setBusy(true);
    try {
      setDomain(await addDomain(name.trim()));
      onChanged();
    } catch (err) {
      setProblem(
        err instanceof ApiError && err.code === "domainverify.claimed_by_other"
          ? "taken"
          : { message: err instanceof ApiError ? err.message : t("setup.loadFailed") },
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!domain) return;
    setProblem(null);
    setBusy(true);
    try {
      setVerified(await verifyDomain(domain.id));
      onChanged();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "domainverify.dns_record_missing") setProblem("missing");
      else if (code === "domainverify.claimed_by_other") setProblem("taken");
      else setProblem({ message: err instanceof ApiError ? err.message : t("setup.loadFailed") });
    } finally {
      setBusy(false);
    }
  }

  const taken = problem === "taken" && (
    <FormAlert title={t("verifyDomain.takenTitle")}>{t("verifyDomain.takenBody")}</FormAlert>
  );
  const message = typeof problem === "object" && problem && <FormAlert title={problem.message} />;

  let content: ReactNode;
  if (verified) {
    content = (
      <DialogContent
        size="md"
        title={t("verifyDomain.verifiedTitle", { domain: verified.domain })}
        description={t("verifyDomain.verifiedBody")}
      >
        <DialogFooter>
          <DialogClose render={<Button />}>{t("verifyDomain.done")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    );
  } else if (domain) {
    content = (
      <DialogContent
        size="md"
        title={t("verifyDomain.title")}
        description={t("verifyDomain.recordBody")}
      >
        <DialogBody>
          <div className="flex flex-col gap-4">
            {problem === "missing" && (
              <FormAlert tone="warning" title={t("verifyDomain.missingTitle")}>
                {t("verifyDomain.missingBody")}
              </FormAlert>
            )}
            {taken}
            {message}
            <CopyField
              label={t("verifyDomain.host")}
              value={domain.dns_record_name}
              wrap="anywhere"
            />
            <CopyField
              label={t("verifyDomain.value")}
              value={domain.dns_record_value}
              wrap="anywhere"
            />
            <Text size="sm" tone="subtle" render={<p />}>
              {t("verifyDomain.type")}
            </Text>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={busy} />}>
            {t("verifyDomain.later")}
          </DialogClose>
          <Button loading={busy} onClick={() => void verify()}>
            {busy ? t("verifyDomain.checking") : t("verifyDomain.verify")}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  } else {
    content = (
      <DialogContent
        size="md"
        title={t("verifyDomain.title")}
        description={t("verifyDomain.domainBody")}
      >
        <form onSubmit={add}>
          <DialogBody>
            <div className="flex flex-col gap-4">
              {taken}
              {message}
              <TextField
                label={t("verifyDomain.domain")}
                required
                autoFocus
                spellCheck={false}
                placeholder={t("verifyDomain.domainHint")}
                invalid={problem === "taken"}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={busy} />}>
              {t("verifyDomain.cancel")}
            </DialogClose>
            <Button type="submit" loading={busy}>
              {t("verifyDomain.next")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {content}
    </Dialog>
  );
}
