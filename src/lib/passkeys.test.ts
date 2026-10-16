import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { ApiError } from "./api";
import { addPasskey, passkeyErrorKey, shouldOfferPasskey } from "./passkeys";

// These run outside a browser, so each test installs the few browser globals
// the module touches: fetch, the CSRF cookie, and the WebAuthn API.
type Call = { url: string; init: RequestInit };

const g = globalThis as Record<string, unknown>;
const saved = { fetch: g.fetch, window: g.window, document: g.document, navigator: g.navigator };

function setGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function browser({ create }: { create?: () => unknown } = {}) {
  setGlobal("window", { PublicKeyCredential: { parseCreationOptionsFromJSON: (o: unknown) => o } });
  setGlobal("navigator", { credentials: { create: async () => (create ? create() : null) } });
  setGlobal("document", { cookie: "qe_csrf=csrf-token" });
}

function respond(...responses: (() => Response | Promise<Response>)[]): Call[] {
  const calls: Call[] = [];
  setGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request ${url}`);
    return next();
  });
  return calls;
}

const json = (status: number, body: unknown) => () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) setGlobal(name, value);
});

test("offers a passkey after sign-in only when the user has none and may add one", async () => {
  browser();
  respond(json(200, { items: [], enrollment_allowed: true }));
  assert.equal(await shouldOfferPasskey(), true);

  respond(json(200, { items: [], enrollment_allowed: false }));
  assert.equal(await shouldOfferPasskey(), false, "organization has passkeys switched off");

  respond(json(200, { items: [{ id: "pk1", created_at: "2026-10-01T00:00:00Z" }], enrollment_allowed: true }));
  assert.equal(await shouldOfferPasskey(), false, "user already has a passkey");
});

test("never holds up the journey: errors, a slow answer and old browsers all mean no offer", async () => {
  browser();
  respond(json(401, { error: { code: "unauthorized", message: "no session" } }));
  assert.equal(await shouldOfferPasskey(), false);

  respond(() => Promise.reject(new TypeError("network down")));
  assert.equal(await shouldOfferPasskey(), false);

  respond(() => new Promise<Response>(() => {}));
  const started = Date.now();
  assert.equal(await shouldOfferPasskey(50), false);
  assert.ok(Date.now() - started < 1000, "the check gives up at its timeout");

  setGlobal("window", {});
  const calls = respond();
  assert.equal(await shouldOfferPasskey(), false);
  assert.equal(calls.length, 0, "a browser without WebAuthn is not asked anything");
});

test("adding a passkey sends the session cookie and the CSRF token on both steps", async () => {
  browser({ create: () => ({ toJSON: () => ({ id: "cred-1", type: "public-key" }) }) });
  const calls = respond(
    json(200, { session_id: "ceremony-1", publicKey: { challenge: "abc" } }),
    () => new Response(null, { status: 204 }),
  );

  await addPasskey("  Work laptop  ");

  assert.deepEqual(
    calls.map((c) => new URL(c.url).pathname),
    ["/v1/passkeys/register/begin", "/v1/passkeys/register/finish"],
  );
  for (const { init } of calls) {
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "include");
    assert.equal(new Headers(init.headers).get("X-CSRF-Token"), "csrf-token");
  }
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    session_id: "ceremony-1",
    credential: { id: "cred-1", type: "public-key" },
    name: "Work laptop",
  });
});

test("a declined name is sent empty so the server names the passkey", async () => {
  browser({ create: () => ({ toJSON: () => ({ id: "cred-2" }) }) });
  const calls = respond(json(200, { session_id: "ceremony-2", publicKey: {} }), () => new Response(null, { status: 204 }));
  await addPasskey("");
  assert.equal(JSON.parse(String(calls[1].init.body)).name, "");
});

test("failures map to copy, never to the backend's message", () => {
  const api = (status: number, code: string) => new ApiError(status, code, "internal detail");
  assert.equal(passkeyErrorKey(api(403, "passkey.disabled")), "errors.disabled");
  assert.equal(passkeyErrorKey(api(401, "unauthorized")), "errors.signedOut");
  assert.equal(passkeyErrorKey(api(400, "auth.session_expired")), "errors.expired");
  assert.equal(passkeyErrorKey(api(403, "http_403")), "errors.refused");
  assert.equal(passkeyErrorKey(api(500, "internal")), "errors.generic");
  assert.equal(passkeyErrorKey(new DOMException("dismissed", "NotAllowedError")), "errors.cancelled");
  assert.equal(passkeyErrorKey(new DOMException("exists", "InvalidStateError")), "errors.alreadyRegistered");
  assert.equal(passkeyErrorKey(new Error("anything")), "errors.generic");
});
