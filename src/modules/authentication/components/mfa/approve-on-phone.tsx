"use client";

import { Button, Spinner, Text } from "@qeetrix/react";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { completeSecondStep, sendPushRequest } from "@/modules/authentication/api/mfa";
import { ApiError } from "@/platform/api/client";

import type { Branding } from "@/platform/branding/branding";
import { FormAlert } from "@/platform/components/form-alert";
import { FormStack } from "@/platform/components/form-parts";
import { HostedPage } from "@/platform/components/hosted-page";
import { formatClock } from "@/platform/format";
import { RotateCwIcon } from "@/platform/icons";

type State = "sending" | "waiting" | "approved" | "denied" | "ended" | "failed";

/** How a request on the phone ended: approved, refused, out of time, or a failure to say. */
type Outcome = { state: "approved" | "denied" | "ended" } | { state: "failed"; error: unknown };

const POLL_MS = 2000;

/**
 * Checks for the phone's answer every POLL_MS until there is one, or `current` says a newer
 * request took over (then null). An unanswered check costs no attempt.
 */
async function waitForPhone(
  mfaToken: string,
  remember: boolean,
  current: () => boolean,
): Promise<Outcome | null> {
  while (current()) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    if (!current()) return null;
    try {
      await completeSecondStep(mfaToken, { remember, push: true });
      return { state: "approved" };
    } catch (err) {
      if (err instanceof ApiError && err.code === "mfa.push_pending") continue;
      return outcomeOf(err);
    }
  }
  return null;
}

function outcomeOf(err: unknown): Outcome {
  const code = err instanceof ApiError ? err.code : "";
  if (code === "mfa.code_invalid") return { state: "denied" };
  if (code === "mfa.push_challenge_expired") return { state: "ended" };
  return { state: "failed", error: err };
}

// The waiting line: sending, then the time left while it is known.
function waitingLine(state: State, secondsLeft: number | null, t: TFunction<"signIn">): string {
  if (state === "sending") return t("mfa.push.sending");
  if (secondsLeft !== null && secondsLeft > 0) {
    return t("mfa.push.waiting", { time: formatClock(secondsLeft) });
  }
  return t("mfa.push.waitingNoTime");
}

/**
 * The second step on the phone: a request goes to Qeet ID on the linked phone, and the page shows
 * the two-digit number to type there, so a request someone else started can't be approved by a
 * tap. It waits for the phone's answer (an unanswered check costs no attempt) and moves on by
 * itself once approved. Denied says nobody signed in; no answer in time offers a new request.
 */
export function ApproveOnPhone({
  mfaToken,
  remember,
  branding,
  lead,
  onApproved,
  onAnother,
}: Readonly<{
  mfaToken: string;
  remember: boolean;
  branding?: Branding;
  lead?: React.ReactNode;
  onApproved: () => void | Promise<void>;
  onAnother: () => void;
}>) {
  const { t } = useTranslation("signIn");
  const [state, setState] = useState<State>("sending");
  const [number, setNumber] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  // The current request's number: a newer request stops the older one's checks.
  const run = useRef(0);

  const start = useCallback(async () => {
    const mine = ++run.current;
    const current = () => mine === run.current;
    setError(null);
    setState("sending");
    let outcome: Outcome | null;
    try {
      const res = await sendPushRequest(mfaToken);
      if (!current()) return;
      setNumber(typeof res.number === "number" ? res.number : null);
      setExpiresAt(res.expires_at ? Date.parse(res.expires_at) : null);
      setState("waiting");
      outcome = await waitForPhone(mfaToken, remember, current);
    } catch (err) {
      outcome = { state: "failed", error: err };
    }
    if (!outcome || !current()) return;
    if (outcome.state === "failed") {
      const err = outcome.error;
      setError(err instanceof ApiError ? err.message : t("problems.generic.title"));
    }
    setState(outcome.state);
    if (outcome.state === "approved") await onApproved();
  }, [mfaToken, remember, onApproved, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one request when the step opens
  useEffect(() => {
    void start();
    return () => {
      run.current++;
    };
  }, []);

  const waiting = state === "waiting";
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  const another = (
    <Button type="button" variant="ghost" size="lg" fullWidth onClick={onAnother}>
      {t("mfa.another")}
    </Button>
  );
  const resend = (
    <Button type="button" size="lg" fullWidth icon={RotateCwIcon} onClick={() => void start()}>
      {t("mfa.push.resend")}
    </Button>
  );

  if (state === "approved") {
    return (
      <HostedPage
        single
        status="success"
        branding={branding}
        title={t("mfa.push.approvedTitle")}
        description={t("mfa.push.approvedBody")}
      >
        <div role="status" className="flex items-center gap-3 py-2">
          <Spinner size="md" tone="brand" decorative />
          <Text size="md" tone="subtle">
            {t("mfa.push.continuing")}
          </Text>
        </div>
      </HostedPage>
    );
  }

  if (state === "denied" || state === "ended") {
    const denied = state === "denied";
    return (
      <HostedPage
        single
        status={denied ? "danger" : "warning"}
        branding={branding}
        title={t(denied ? "mfa.push.deniedTitle" : "mfa.push.endedTitle")}
        description={t(denied ? "mfa.push.deniedBody" : "mfa.push.endedBody")}
      >
        <FormStack>
          {resend}
          {another}
        </FormStack>
      </HostedPage>
    );
  }

  const secondsLeft = expiresAt ? Math.round((expiresAt - now) / 1000) : null;
  return (
    <HostedPage
      branding={branding}
      title={t("mfa.push.title")}
      description={t("mfa.push.body")}
      lead={lead}
    >
      <FormStack>
        <FormAlert title={error} />
        {number !== null && (
          <div
            role="img"
            aria-label={`${t("mfa.push.number")}: ${number}`}
            className="flex flex-col items-center gap-2 rounded-surface border border-border-default bg-surface-default px-6 py-6"
          >
            <Text size="sm" tone="subtle" aria-hidden>
              {t("mfa.push.number")}
            </Text>
            <span
              aria-hidden
              className="text-[56px] leading-none font-semibold text-text-default tabular-nums tablet:text-[64px]"
              style={{ fontVariationSettings: '"GEOM" var(--qx-font-geometry-display)' }}
            >
              {number}
            </span>
          </div>
        )}
        {state !== "failed" && (
          <div className="flex items-center gap-3">
            <Spinner size="sm" tone="brand" decorative />
            <Text size="md" tone="subtle" render={<p />}>
              {/* Announced once; the time left counts down on screen only. */}
              <span role="status" className="sr-only">
                {state === "sending" ? t("mfa.push.sending") : t("mfa.push.waitingNoTime")}
              </span>
              <span aria-hidden>{waitingLine(state, secondsLeft, t)}</span>
            </Text>
          </div>
        )}
        {state === "failed" && resend}
        {another}
      </FormStack>
    </HostedPage>
  );
}
