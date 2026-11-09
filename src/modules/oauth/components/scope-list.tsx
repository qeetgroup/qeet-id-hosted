"use client";

import { Text } from "@qeetrix/react";
import { useTranslation } from "react-i18next";

import { type Icon, MailIcon, RefreshCwIcon, ShieldCheckIcon, UserRoundIcon } from "@/platform/icons";

const ICONS: Record<string, Icon> = {
  openid: ShieldCheckIcon,
  profile: UserRoundIcon,
  email: MailIcon,
  offline_access: RefreshCwIcon,
};

/**
 * What an application may do with the account: one OAuth scope per ruled row, in plain words with
 * an icon. A scope without words of its own shows its name. With none, it can still confirm who
 * the person is.
 */
export function ScopeList({ scopes, className }: { scopes: string[]; className?: string }) {
  const { t } = useTranslation("common");
  const rows = scopes.length > 0 ? scopes : ["openid"];
  return (
    <ul
      className={`divide-y divide-border-subtle rounded-surface border border-border-default ${className ?? ""}`}
    >
      {rows.map((s) => {
        const ScopeIcon = ICONS[s] ?? ShieldCheckIcon;
        return (
          <li key={s} className="flex items-center gap-3 px-4 py-3">
            <ScopeIcon size={20} className="shrink-0 text-icon-subtle" />
            <Text size="md">{t(`scopes.${s}`, { defaultValue: s })}</Text>
          </li>
        );
      })}
    </ul>
  );
}
