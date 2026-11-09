"use client";

import { Avatar, Button, Text } from "@qeetrix/react";

/**
 * The account being signed in to, once its email is known: the person, the address, and a way back
 * to change it. Ruled, like every surface in the flow.
 */
export function AccountChip({
  email,
  name,
  action,
  onAction,
}: {
  email: string;
  name?: string;
  /** The button's label, such as Change; no button without one. */
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-control border border-border-default py-2 ps-3 pe-2">
      <Avatar name={name || email} size="sm" decorative />
      <div className="min-w-0 flex-1">
        {name && (
          <Text size="md" weight="medium" truncate render={<p />}>
            {name}
          </Text>
        )}
        <Text size={name ? "sm" : "md"} tone={name ? "subtle" : "default"} truncate render={<p />}>
          {email}
        </Text>
      </div>
      {action && (
        <Button type="button" variant="ghost" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
