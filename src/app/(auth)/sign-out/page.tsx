import { SignOutPage } from "@/modules/sign-out/components/sign-out-page";

// The API sends a sign-out that names no sign-in (no id_token_hint) here to be
// confirmed, with a short-lived ticket that lets the confirmed request end the
// session. A plain link or image therefore can't sign anyone out.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <SignOutPage
      ticket={sp.logout_confirmation ?? ""}
      clientId={sp.client_id ?? ""}
      postLogoutRedirect={sp.post_logout_redirect_uri ?? ""}
      state={sp.state ?? ""}
    />
  );
}
