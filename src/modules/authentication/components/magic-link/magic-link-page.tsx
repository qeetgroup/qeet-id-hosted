import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";
import { AuthShell } from "@/platform/components/auth-shell";

import { MagicSignIn } from "./magic-sign-in";

// The return_to is used here only for the tenant's branding; where to go next
// comes back from the server with the session.
export async function MagicLinkPage({ token, returnTo }: { token: string; returnTo: string }) {
  const branding = normalizeBranding((await getLoginContext(returnTo)).branding);
  return (
    <AuthShell branding={branding}>
      <MagicSignIn token={token} branding={branding} />
    </AuthShell>
  );
}
