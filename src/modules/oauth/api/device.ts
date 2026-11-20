// A device without a keyboard signing in (RFC 8628): the person confirms the code it shows here,
// signed in to the hosted login, and allows or denies it.

import { backend } from "@/platform/api/backend";

/** The device behind a code: the application's name and the scopes it asks for. */
export type DeviceRequest = { clientName: string; scopes: string[] };

/** Looks up a code; 401 when no one is signed in, and one refusal for an unknown or used code. */
export async function readDeviceRequest(userCode: string): Promise<DeviceRequest> {
  const res = await backend.get("/v1/oauth/device", { query: { user_code: userCode } });
  return { clientName: res.client_name, scopes: res.scopes };
}

/** Allows or denies the device; resolves to whether it may now sign itself in. */
export async function decideDevice(userCode: string, approve: boolean): Promise<boolean> {
  const res = await backend.post("/v1/oauth/device/decision", {
    body: { user_code: userCode, approve },
  });
  return res.status === "authorized";
}
