import type { LoginContext, PasswordPolicy } from "./login-context";

/**
 * What a page says about the organisation behind the application: its name, its password rules,
 * how long its sign-in links work and how long it remembers a device. Each is absent when the
 * server didn't send it, and the page then says it in general words.
 */
export type Organisation = {
  name?: string;
  passwordPolicy?: PasswordPolicy;
  linkMinutes?: number;
  rememberDays?: number;
};

export function organisationOf(ctx: LoginContext): Organisation {
  return {
    ...(ctx.organization_name ? { name: ctx.organization_name } : {}),
    ...(ctx.password_policy ? { passwordPolicy: ctx.password_policy } : {}),
    ...(ctx.magic_link_ttl_minutes ? { linkMinutes: ctx.magic_link_ttl_minutes } : {}),
    ...(ctx.remember_device_days ? { rememberDays: ctx.remember_device_days } : {}),
  };
}
