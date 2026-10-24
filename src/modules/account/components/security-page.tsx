import { AuthShell } from "@/platform/components/auth-shell";

import { SecurityView } from "./security-view";

/** The signed-in user's own security page: their passkeys, renamed or added here. */
export function SecurityPage() {
  return (
    <AuthShell>
      <SecurityView />
    </AuthShell>
  );
}
