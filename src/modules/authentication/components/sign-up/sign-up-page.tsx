import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";

import { SignUpForm } from "./sign-up-form";

// Self-registration is the organisation's choice: whether sign-up is open, and for which
// organisation, comes from the application's login context (as on the sign-in page). The server
// checks again when the account is made, so this only decides what the page shows.
export async function SignUpPage({ returnTo }: { returnTo: string }) {
  const ctx = await getLoginContext(returnTo);
  return (
    <SignUpForm
      returnTo={returnTo}
      clientName={ctx.client_name ?? ""}
      clientLogoUri={ctx.logo_uri}
      tenantId={ctx.tenant_id ?? ""}
      selfRegistrationEnabled={ctx.self_registration_enabled ?? false}
      branding={normalizeBranding(ctx.branding)}
    />
  );
}
