"use client";

import { Button, Text, TextField } from "@qeetrix/react";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type DeviceRequest, decideDevice, readDeviceRequest } from "@/modules/oauth/api/device";
import { type Account, fetchSignedInAccount } from "@/platform/api/account";
import { ApiError } from "@/platform/api/client";
import { apiErrorMessage } from "@/platform/api/errors";
import { signOutHostedSession } from "@/platform/api/session";
import { AccountChip } from "@/platform/components/account-chip";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { ArrowRightIcon, TvMinimalIcon } from "@/platform/icons";
import { goTo } from "@/platform/navigation/go-to";

import { ScopeList } from "./scope-list";

// Through sign-in and back to this page, with the code, when no one is signed in yet.
function signInRedirect(code: string): string {
  const returnTo = `/device?user_code=${encodeURIComponent(code)}`;
  return `/sign-in?return_to=${encodeURIComponent(returnTo)}`;
}

/**
 * For a device without a keyboard (a TV, a shop-floor display, a command line): the person types
 * the code it shows (or a link from the device carries it), then sees which device is asking and
 * what it could do, with a plain warning to allow only a device they started this on (RFC 8628
 * §5.4). An unknown, expired or used code gets one answer. Allowed, the device signs itself in.
 */
export function DeviceForm({ userCode }: { userCode: string }) {
  const { t } = useTranslation("device");
  const [code, setCode] = useState(userCode.toUpperCase());
  const [ctx, setCtx] = useState<DeviceRequest | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [decision, setDecision] = useState<"authorized" | "denied" | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"continue" | "allow" | "deny" | null>(null);

  useEffect(() => {
    void fetchSignedInAccount().then(setAccount);
  }, []);

  async function lookUp(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    setWrong(null);
    setError(null);
    if (!trimmed) {
      setWrong(t("required"));
      return;
    }
    setBusy("continue");
    try {
      setCtx(await readDeviceRequest(trimmed));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        goTo(signInRedirect(trimmed));
        return;
      }
      if (err instanceof ApiError && [400, 404, 409].includes(err.status)) setWrong(t("wrong"));
      else setError(apiErrorMessage(err, t, t("signIn:problems.generic.title")));
    }
    setBusy(null);
  }

  // Another account: sign this browser out, then sign in again on the way back to this code.
  async function changeAccount() {
    try {
      await signOutHostedSession();
    } catch {
      // Signed out or not, sign-in asks again.
    }
    goTo(signInRedirect(code.trim()));
  }

  async function decide(approve: boolean) {
    setError(null);
    setBusy(approve ? "allow" : "deny");
    try {
      setDecision((await decideDevice(code.trim(), approve)) ? "authorized" : "denied");
    } catch (err) {
      setError(apiErrorMessage(err, t, t("signIn:problems.generic.title")));
    }
    setBusy(null);
  }

  const device = ctx?.clientName || t("common:fallbacks.device");

  if (decision) {
    const allowed = decision === "authorized";
    return (
      <HostedPage
        single
        status={allowed ? "success" : "info"}
        title={t(allowed ? "allowedTitle" : "deniedTitle")}
        description={allowed ? t("allowedBody", { device }) : t("deniedBody")}
      />
    );
  }

  if (ctx) {
    return (
      <HostedPage
        title={t("allowTitle", { device })}
        lead={
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-control bg-[#ffffff] text-[#1f1f1f] ring-1 ring-border-default"
            >
              <TvMinimalIcon size={24} />
            </span>
            <Text size="md" tone="subtle" mono render={<p />}>
              {t("codeLine", { code: code.trim() })}
            </Text>
          </div>
        }
      >
        <FormStack>
          <FormAlert title={error} />
          <FormAlert tone="warning" title={t("warnTitle")}>
            {t("warnBody")}
          </FormAlert>
          <div>
            <Text size="md" weight="medium" render={<p />}>
              {t("allowBody")}
            </Text>
            <ScopeList className="mt-3" scopes={ctx.scopes ?? []} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="soft"
              size="lg"
              fullWidth
              loading={busy === "deny"}
              disabled={busy !== null}
              onClick={() => void decide(false)}
            >
              {t("deny")}
            </Button>
            <Button
              type="button"
              size="lg"
              fullWidth
              loading={busy === "allow"}
              disabled={busy !== null}
              onClick={() => void decide(true)}
            >
              {t("allow")}
            </Button>
          </div>
        </FormStack>
      </HostedPage>
    );
  }

  return (
    <HostedPage
      title={t("title")}
      description={t("body")}
      lead={
        account ? (
          <AccountChip
            email={account.email}
            name={account.name}
            action={t("change")}
            onAction={() => void changeAccount()}
          />
        ) : undefined
      }
    >
      <form onSubmit={lookUp}>
        <FormStack>
          <FormAlert title={error} />
          <TextField
            label={t("code")}
            name="user_code"
            autoFocus={!userCode}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t("codeHint")}
            description={userCode && !wrong ? t("filledHelp") : undefined}
            invalid={Boolean(wrong)}
            error={wrong ?? undefined}
            value={code}
            onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
          />
          <Button
            type="submit"
            size="lg"
            fullWidth
            icon={ArrowRightIcon}
            loading={busy === "continue"}
          >
            {t("continue")}
          </Button>
        </FormStack>
      </form>
    </HostedPage>
  );
}
