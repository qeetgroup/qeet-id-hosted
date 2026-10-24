"use client";

import { LockIcon } from "@qeetrix/icons";
import { cn, PasswordInput } from "@qeetrix/ui";
import type { ComponentProps } from "react";

/** A password field with a leading lock icon and the built-in show/hide toggle. */
export function IconPasswordInput({ className, ...props }: ComponentProps<typeof PasswordInput>) {
  return (
    <div className="relative">
      <LockIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 z-10 size-5 -translate-y-1/2"
      />
      <PasswordInput className={cn("icon-password-input", className)} {...props} />
    </div>
  );
}
