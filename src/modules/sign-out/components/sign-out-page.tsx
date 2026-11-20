import { SignOutConfirm } from "./sign-out-confirm";

/** Asks before ending the Qeet ID session, for a sign-out that named no sign-in. */
export function SignOutPage(
  props: Readonly<{
    ticket: string;
    clientId: string;
    postLogoutRedirect: string;
    state: string;
  }>,
) {
  return <SignOutConfirm {...props} />;
}
