import { AuthShell } from "@/components/auth-shell";
import { normalizeBranding } from "@/lib/branding";
import { fetchBrandingForReturnTo } from "@/lib/login-context";

import { ForgotPasswordForm } from "./forgot-password-form";

// The reset look-up needs only the email (it is unique platform-wide). The
// return_to is passed on so the emailed link comes back to this hosted login
// and, after the reset, on to the application; it also gives the page the
// tenant's branding.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to } = await searchParams;
  const returnTo = return_to ?? "";
  const branding = normalizeBranding(await fetchBrandingForReturnTo(returnTo));
  return (
    <AuthShell branding={branding}>
      <ForgotPasswordForm returnTo={returnTo} branding={branding} />
    </AuthShell>
  );
}
