import { organisationOf } from "@/platform/api/organisation";
import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";

import { SignInForm } from "./sign-in-form";

// Rendered on the server with the application's login context: its name and logo, its
// organisation's branding and the ways that organisation allows, so the first paint is right.
export async function SignInPage({ returnTo, errorCode }: { returnTo: string; errorCode: string }) {
  const ctx = await getLoginContext(returnTo);
  return (
    <SignInForm
      returnTo={returnTo}
      clientName={ctx.client_name ?? ""}
      clientLogoUri={ctx.logo_uri}
      organizationId={ctx.organization_id ?? ""}
      providers={ctx.providers ?? []}
      selfRegistrationEnabled={ctx.self_registration_enabled ?? false}
      rememberDeviceEnabled={ctx.remember_device_enabled ?? false}
      passwordEnabled={ctx.sign_in_methods?.password ?? true}
      passkeyEnabled={ctx.sign_in_methods?.passkey ?? true}
      magicLinkEnabled={ctx.sign_in_methods?.magic_link ?? false}
      errorCode={errorCode}
      organisation={organisationOf(ctx)}
      branding={normalizeBranding(ctx.branding)}
    />
  );
}
