"use client";

import { Badge, Card, Text } from "@qeetrix/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { CircleCheckIcon } from "@/platform/icons";

/** The open step: its name, what it's for, where it is in the setup, and its work. */
export function CurrentStep({
  n,
  total,
  title,
  body,
  finished,
  children,
}: Readonly<{
  n: number;
  total: number;
  title: string;
  body?: string;
  /** Shows Passed in place of the step number, for a step whose result is on screen. */
  finished?: boolean;
  children: ReactNode;
}>) {
  const { t } = useTranslation("enterpriseSetup");
  return (
    <Card
      title={title}
      level={2}
      description={body}
      actions={
        finished ? (
          <Badge tone="success" icon={CircleCheckIcon}>
            {t("test.passed")}
          </Badge>
        ) : (
          <Text size="sm" tone="subtle">
            {t("setup.stepOf", { n, total })}
          </Text>
        )
      }
    >
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  );
}

/** A finished step, folded to one ruled line: what was done, and a way back to it. */
export function DoneRow({
  title,
  summary,
  actions,
}: Readonly<{
  title: string;
  summary: string;
  actions?: ReactNode;
}>) {
  return (
    <div className="flex items-center gap-3 rounded-surface border border-border-default bg-surface-raised py-3 ps-4 pe-2">
      <CircleCheckIcon size={20} className="shrink-0 text-icon-success" />
      <div className="min-w-0 flex-1">
        <Text size="md" weight="medium" render={<p />}>
          {title}
        </Text>
        <Text size="sm" tone="subtle" render={<p />}>
          {summary}
        </Text>
      </div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </div>
  );
}

/** A step still to come: its number, name and what unlocks it, in the subtle colour. */
export function UpcomingRow({
  n,
  title,
  note,
}: Readonly<{ n: number; title: string; note: string }>) {
  return (
    <div className="flex items-center gap-3 rounded-surface border border-border-subtle px-4 py-3">
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-full border border-border-strong typography-body-sm text-text-subtle"
      >
        {n}
      </span>
      <Text size="md" tone="subtle" className="flex-1" render={<p />}>
        {title}
      </Text>
      <Text size="sm" tone="subtle">
        {note}
      </Text>
    </div>
  );
}
