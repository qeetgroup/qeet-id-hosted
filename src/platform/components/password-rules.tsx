"use client";

import { Text } from "@qeetrix/react";
import { useTranslation } from "react-i18next";

import type { PasswordPolicy } from "@/platform/api/login-context";
import { CircleCheckIcon, CircleDashedIcon } from "@/platform/icons";

/** Which of the organisation's rules a password meets, in the order the page lists them. */
export function passwordRules(policy: PasswordPolicy, password: string) {
  const rules: { id: string; met: boolean; length?: number }[] = [];
  if (policy.min_length) {
    rules.push({
      id: "length",
      met: Array.from(password).length >= policy.min_length,
      length: policy.min_length,
    });
  }
  if (policy.require_uppercase) rules.push({ id: "uppercase", met: /\p{Lu}/u.test(password) });
  if (policy.require_number) rules.push({ id: "number", met: /\p{Nd}/u.test(password) });
  if (policy.require_symbol) rules.push({ id: "symbol", met: /[^\p{L}\p{Nd}\s]/u.test(password) });
  return rules;
}

/**
 * The organisation's password rules under a new-password field, each ticking as it is met: a tick
 * in the success colour, or an open circle, never colour alone. The server checks them again.
 */
export function PasswordRules({
  policy,
  password,
}: Readonly<{ policy: PasswordPolicy; password: string }>) {
  const { t } = useTranslation("common");
  return (
    <ul aria-label={t("passwordRules.label")} className="-mt-2 flex flex-col gap-1.5">
      {passwordRules(policy, password).map((rule) => {
        const Icon = rule.met ? CircleCheckIcon : CircleDashedIcon;
        return (
          <li key={rule.id} className="flex items-center gap-2">
            <Icon size={16} className={rule.met ? "text-icon-success" : "text-icon-subtle"} />
            <Text size="sm" tone={rule.met ? "default" : "subtle"}>
              {t(`passwordRules.${rule.id}`, { count: rule.length })}
              <span className="sr-only">
                {rule.met ? t("passwordRules.met") : t("passwordRules.notMet")}
              </span>
            </Text>
          </li>
        );
      })}
    </ul>
  );
}
