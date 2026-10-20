import { AuthShell } from "@/components/auth-shell";

import { LoggedOutContent } from "./logged-out-content";

// Shown after a sign-out. The API sends the browser here with each signed-in
// application's front-channel sign-out page (frontchannel_logout, repeated)
// and, when the application asked to be returned to, a signed continuation
// ticket (continue).
export default async function LoggedOutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const ticket = list(sp.continue)[0] ?? "";
  return (
    <AuthShell>
      <LoggedOutContent frontchannel={list(sp.frontchannel_logout)} continueTicket={ticket} />
    </AuthShell>
  );
}
