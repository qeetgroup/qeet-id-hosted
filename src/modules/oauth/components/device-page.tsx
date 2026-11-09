import { DeviceForm } from "./device-form";

// The device flow arrives with only a user code (no client_id), so there's no organisation to take
// branding from: the page is Qeet ID's own.
export function DevicePage({ userCode }: { userCode: string }) {
  return <DeviceForm userCode={userCode} />;
}
