"use client";

import { Alert, type AlertTone } from "@qeetrix/react/experimental";
import type { ReactNode } from "react";

/**
 * A form's message: what went wrong and what to do next, as the mockups write them. A short
 * message is the title alone; a longer one has a title and a body. Renders nothing without a
 * title, so a form passes its nullable error straight through. Announced at once, since it
 * answers what the person just did.
 */
export function FormAlert({
  title,
  children,
  tone = "danger",
  actions,
  className,
}: Readonly<{
  title?: ReactNode;
  children?: ReactNode;
  tone?: AlertTone;
  actions?: ReactNode;
  className?: string;
}>) {
  if (!title) return null;
  return (
    <Alert tone={tone} title={title} actions={actions} announce="urgent" className={className}>
      {children}
    </Alert>
  );
}
