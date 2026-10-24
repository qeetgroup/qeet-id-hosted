import { Separator } from "@qeetrix/ui";
import type { ReactNode } from "react";

/** A rule with a short label in the middle, such as "Or continue with". */
export function OrDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <Separator className="flex-1" />
      <span className="text-muted-foreground text-sm whitespace-nowrap">{children}</span>
      <Separator className="flex-1" />
    </div>
  );
}
