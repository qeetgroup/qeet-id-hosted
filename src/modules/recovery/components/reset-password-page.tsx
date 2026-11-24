import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";

import { ResetPasswordForm } from "./reset-password-form";

// The return_to gives the page the tenant's branding and, after the reset, the
// way back to sign-in and on to the application.
export async function ResetPasswordPage({
  token,
  returnTo,
}: Readonly<{ token: string; returnTo: string }>) {
  const ctx = await getLoginContext(returnTo);
  return (
    <ResetPasswordForm
      token={token}
      returnTo={returnTo}
      passwordPolicy={ctx.password_policy}
      branding={normalizeBranding(ctx.branding)}
    />
  );
}
