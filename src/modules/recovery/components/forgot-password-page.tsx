import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";
import { AuthShell } from "@/platform/components/auth-shell";

import { ForgotPasswordForm } from "./forgot-password-form";

// The reset look-up needs only the email (it is unique platform-wide). The
// return_to is passed on so the emailed link comes back to this hosted login
// and, after the reset, on to the application; it also gives the page the
// tenant's branding.
export async function ForgotPasswordPage({ returnTo }: { returnTo: string }) {
  const branding = normalizeBranding((await getLoginContext(returnTo)).branding);
  return (
    <AuthShell branding={branding}>
      <ForgotPasswordForm returnTo={returnTo} branding={branding} />
    </AuthShell>
  );
}
