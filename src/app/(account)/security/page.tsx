import { SecurityPage } from "@/modules/account/components/security-page";

// Reachable directly at /security; a browser that isn't signed in is offered
// sign-in, which lands back here.
export default function Page() {
  return <SecurityPage />;
}
