import { SignedOutPage } from "@/modules/sign-out/components/signed-out-page";

// Shown after a sign-out. The API sends the browser here with each signed-in
// application's front-channel sign-out page (frontchannel_logout, repeated)
// and, when the application asked to be returned to, a signed continuation
// ticket (continue).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  return (
    <SignedOutPage
      frontchannel={list(sp.frontchannel_logout)}
      continueTicket={list(sp.continue)[0] ?? ""}
    />
  );
}
