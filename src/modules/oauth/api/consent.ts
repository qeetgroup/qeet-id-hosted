// An application's request to act for the signed-in person, recorded by the server when its
// authorize call needed consent; the address carries only its id. The hosted login session
// cookie, sent with each call, is what lets this browser read and answer it.

import { backend } from "@/platform/api/backend";

/** The recorded request: the application asking and the scopes it asks for. */
export type ConsentRequest = { requestId: string; clientId: string; scopes: string[] };

/** Reads the recorded request; refused when it is unknown, expired, answered or another's. */
export async function readConsentRequest(requestId: string): Promise<ConsentRequest> {
  const req = await backend.get("/v1/oauth/authorize/request", {
    query: { request_id: requestId },
  });
  return {
    requestId: req.request_id ?? requestId,
    clientId: req.client_id ?? "",
    scopes: (req.scope ?? "").split(/\s+/).filter(Boolean),
  };
}

/** Answers it; an allowed request answers where the browser goes next (the application). */
export async function decideConsent(requestId: string, approve: boolean): Promise<string> {
  const res = await backend.post("/v1/oauth/authorize/decision", {
    body: { request_id: requestId, approve },
  });
  return res?.redirect ?? "";
}
