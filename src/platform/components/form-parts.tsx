"use client";

import { Link, Text } from "@qeetrix/react";
import type { ReactNode } from "react";

import { ChevronRightIcon, type Icon } from "@/platform/icons";

/** A column of form parts with the form's rhythm: 20 px between fields, actions and links. */
export function FormStack({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={`flex flex-col gap-5 ${className ?? ""}`}>{children}</div>;
}

/** "or", between two ways of doing the same thing, on a hairline. */
export function OrDivider({ label }: Readonly<{ label: string }>) {
  return (
    <div className="my-6 flex items-center gap-3">
      <span aria-hidden className="h-px flex-1 bg-border-subtle" />
      <Text size="sm" tone="subtle">
        {label}
      </Text>
      <span aria-hidden className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

/** A line of text ending in a link: "Don't have an account? Create one". */
export function AsideLine({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Text size="md" tone="subtle" className="flex flex-wrap items-center gap-x-1" render={<p />}>
      {children}
    </Text>
  );
}

/**
 * A link that stands on its own line ("Forgot password?"), not inside a sentence: 28 px tall, so
 * it is a 24 px target at least (WCAG 2.5.8) and keeps the form's rhythm.
 */
export function TextLink({
  href,
  onClick,
  children,
}: Readonly<{
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}>) {
  if (!href) {
    return (
      <Link
        render={<button type="button" />}
        onClick={onClick}
        className="inline-flex min-h-7 items-center self-start"
      >
        {children}
      </Link>
    );
  }
  return (
    <Link href={href} className="inline-flex min-h-7 items-center self-start">
      {children}
    </Link>
  );
}

export type Choice = {
  id: string;
  icon: Icon;
  title: string;
  detail?: string;
  onClick: () => void;
  disabled?: boolean;
};

/**
 * A ruled list of choices, each a whole-row button with an icon, a title, a line of detail and a
 * chevron: other ways to verify, a connection to choose.
 */
export function ChoiceList({ label, items }: Readonly<{ label: string; items: Choice[] }>) {
  return (
    <ul
      aria-label={label}
      className="divide-y divide-border-subtle rounded-surface border border-border-default"
    >
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button"
            onClick={it.onClick}
            disabled={it.disabled}
            className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors duration-(--qx-motion-duration-fast) hover:bg-bg-neutral-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus disabled:opacity-60"
          >
            <it.icon size={20} className="shrink-0 text-icon-subtle" />
            <span className="min-w-0 flex-1">
              <Text size="md" weight="medium" render={<span className="block" />}>
                {it.title}
              </Text>
              {it.detail && (
                <Text size="sm" tone="subtle" render={<span className="block" />}>
                  {it.detail}
                </Text>
              )}
            </span>
            <ChevronRightIcon size={16} className="shrink-0 text-icon-subtle" />
          </button>
        </li>
      ))}
    </ul>
  );
}
