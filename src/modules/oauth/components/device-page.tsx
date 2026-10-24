import { AuthShell } from "@/platform/components/auth-shell";

import { DeviceForm } from "./device-form";

// The device flow arrives with only a user_code (no client_id), so there's no
// tenant to resolve branding from — render the default Qeet shell.
export function DevicePage({ userCode }: { userCode: string }) {
  return (
    <AuthShell>
      <DeviceForm userCode={userCode} />
    </AuthShell>
  );
}
