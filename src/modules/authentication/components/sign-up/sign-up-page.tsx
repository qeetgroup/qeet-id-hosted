import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";
import { AuthShell } from "@/platform/components/auth-shell";

import { SignUpForm } from "./sign-up-form";

// Self-registration is a per-tenant policy. We resolve the tenant + whether
// sign-up is open from the originating client (same login-context the sign-in
// page uses); the backend re-checks the gate on POST, so this only drives UI.
export async function SignUpPage({ returnTo }: { returnTo: string }) {
  const ctx = await getLoginContext(returnTo);
  const branding = normalizeBranding(ctx.branding);
  return (
    <AuthShell branding={branding}>
      <SignUpForm
        returnTo={returnTo}
        clientName={ctx.client_name ?? ""}
        tenantId={ctx.tenant_id ?? ""}
        selfRegistrationEnabled={ctx.self_registration_enabled ?? false}
        branding={branding}
      />
    </AuthShell>
  );
}
