import { getLoginContext } from "@/platform/api/server";
import { normalizeBranding } from "@/platform/branding/branding";

import { MagicSignIn } from "./magic-sign-in";

// The return_to is used here only for the organisation's branding; where to go next comes back
// from the server with the session.
export async function MagicLinkPage({ token, returnTo }: { token: string; returnTo: string }) {
  const ctx = await getLoginContext(returnTo);
  return (
    <MagicSignIn
      token={token}
      linkMinutes={ctx.magic_link_ttl_minutes}
      orgName={ctx.organization_name}
      branding={normalizeBranding(ctx.branding)}
    />
  );
}
