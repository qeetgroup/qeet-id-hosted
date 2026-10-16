import { AuthShell } from "@/components/auth-shell";
import { normalizeBranding } from "@/lib/branding";
import { fetchBrandingForReturnTo } from "@/lib/login-context";

import { ResetForm } from "./reset-form";

// The emailed reset link carries the opaque token and, when the reset started
// on the way into an application, that application's return_to. The return_to
// gives the page the tenant's branding and, after the reset, the way back to
// sign-in and on to the application.
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; return_to?: string }>;
}) {
  const { token, return_to } = await searchParams;
  const returnTo = return_to ?? "";
  const branding = normalizeBranding(await fetchBrandingForReturnTo(returnTo));
  return (
    <AuthShell branding={branding}>
      <ResetForm token={token ?? ""} returnTo={returnTo} branding={branding} />
    </AuthShell>
  );
}
