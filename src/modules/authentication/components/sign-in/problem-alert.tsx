"use client";

import { LinkButton } from "@qeetrix/react";
import { useTranslation } from "react-i18next";

import { FormAlert } from "@/platform/components/form-alert";

import type { Problem } from "../../sign-in-problems";

/**
 * A sign-in refusal as the page says it: a title and what to do next. A wrong password is said at
 * its field instead, so this shows nothing for it. A paused account offers the password reset.
 */
export function ProblemAlert({
  problem,
  forgotHref,
  org,
  className,
}: {
  problem: Problem | null;
  /** The organisation's name, for the refusals that say whose rule it is. */
  org?: string;
  /** Where Reset password goes, for a paused account. */
  forgotHref?: string;
  className?: string;
}) {
  const { t } = useTranslation("signIn");
  if (!problem || problem.kind === "wrong") return null;
  if (problem.kind === "server") {
    return <FormAlert title={problem.message} className={className} />;
  }
  const warning =
    problem.kind === "network" || problem.kind === "passkeyUnsupported" || problem.kind === "sso";
  return (
    <FormAlert
      tone={warning ? "warning" : "danger"}
      title={t(`problems.${problem.kind}.title`)}
      className={className}
      actions={
        problem.kind === "locked" && forgotHref ? (
          <LinkButton size="sm" variant="soft" href={forgotHref}>
            {t("problems.locked.action")}
          </LinkButton>
        ) : undefined
      }
    >
      {org && (problem.kind === "inactive" || problem.kind === "network" || problem.kind === "sso")
        ? t(`problems.${problem.kind}.bodyOrg`, { org })
        : t(`problems.${problem.kind}.body`)}
    </FormAlert>
  );
}
