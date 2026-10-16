import { AuthShell } from "@/components/auth-shell";

import { SecurityView } from "./security-view";

// The signed-in user's own security page on the hosted login: their passkeys,
// which they can rename, and adding a new one. Reachable directly at /security;
// a browser that isn't signed in is offered sign-in, which lands back here.
export default function SecurityPage() {
  return (
    <AuthShell>
      <SecurityView />
    </AuthShell>
  );
}
