import { SignedOutContent } from "./signed-out-content";

/** Signs the person out of each application's page, then says they're signed out. */
export function SignedOutPage({
  frontchannel,
  continueTicket,
}: {
  frontchannel: string[];
  continueTicket: string;
}) {
  return <SignedOutContent frontchannel={frontchannel} continueTicket={continueTicket} />;
}
