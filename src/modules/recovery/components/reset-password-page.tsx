import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";
import { AuthShell } from "@/platform/components/auth-shell";

import { ResetPasswordForm } from "./reset-password-form";

// The return_to gives the page the tenant's branding and, after the reset, the
// way back to sign-in and on to the application.
export async function ResetPasswordPage({ token, returnTo }: { token: string; returnTo: string }) {
  const branding = normalizeBranding((await getLoginContext(returnTo)).branding);
  return (
    <AuthShell branding={branding}>
      <ResetPasswordForm token={token} returnTo={returnTo} branding={branding} />
    </AuthShell>
  );
}
