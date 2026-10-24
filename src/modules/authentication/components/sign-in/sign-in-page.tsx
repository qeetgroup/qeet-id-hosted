import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";
import { AuthShell } from "@/platform/components/auth-shell";

import { SignInForm } from "./sign-in-form";

// Fetched server-side: the client's display name + the tenant's enabled social
// providers, so the form can greet the user and render the right buttons.
export async function SignInPage({ returnTo, errorCode }: { returnTo: string; errorCode: string }) {
  const ctx = await getLoginContext(returnTo);
  const branding = normalizeBranding(ctx.branding);
  return (
    <AuthShell branding={branding}>
      <SignInForm
        returnTo={returnTo}
        clientName={ctx.client_name ?? ""}
        clientLogoUri={ctx.logo_uri}
        clientUri={ctx.client_uri}
        tenantId={ctx.tenant_id ?? ""}
        providers={ctx.providers ?? []}
        selfRegistrationEnabled={ctx.self_registration_enabled ?? false}
        rememberDeviceEnabled={ctx.remember_device_enabled ?? false}
        passwordEnabled={ctx.sign_in_methods?.password ?? true}
        passkeyEnabled={ctx.sign_in_methods?.passkey ?? true}
        magicLinkEnabled={ctx.sign_in_methods?.magic_link ?? false}
        errorCode={errorCode}
        branding={branding}
      />
    </AuthShell>
  );
}
