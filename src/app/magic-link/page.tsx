import { AuthShell } from "@/components/auth-shell";
import { normalizeBranding } from "@/lib/branding";
import { fetchBrandingForReturnTo } from "@/lib/login-context";
import { relayHeaders } from "@/lib/relay-request";

import { MagicSignIn } from "./magic-sign-in";

// The emailed sign-in link carries the one-time token and the return_to of
// the journey it was asked for from — used here only for the tenant's
// branding; where to go next comes back from the server with the session.
export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; return_to?: string }>;
}) {
  const { token, return_to } = await searchParams;
  const branding = normalizeBranding(
    await fetchBrandingForReturnTo(return_to ?? "", await relayHeaders()),
  );
  return (
    <AuthShell branding={branding}>
      <MagicSignIn token={token ?? ""} branding={branding} />
    </AuthShell>
  );
}
