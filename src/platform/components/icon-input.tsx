"use client";

import { cn, Input } from "@qeetrix/ui";
import type { ComponentProps, ComponentType } from "react";

type IconInputProps = ComponentProps<typeof Input> & {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

/** A text field with a leading icon: the shape every hosted form's email and name fields take. */
export function IconInput({ icon: Icon, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <Icon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 z-10 size-5 -translate-y-1/2"
      />
      <Input className={cn("ps-12", className)} {...props} />
    </div>
  );
}
