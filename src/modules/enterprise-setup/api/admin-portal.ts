// The enterprise setup (admin portal) client. The link's one-time credential, read from the URL
// fragment, is exchanged once for the server's HttpOnly portal-session cookie; every later call is
// token-free and CSRF-protected. Names follow the server's routes (/v1/admin-portal/*).

import { assured, assuredItems, type WithRequired } from "@/platform/api/assured";
import { backend } from "@/platform/api/backend";
import type { Body, Schemas } from "@/platform/api/contract";

export type AdminPortalCapability = "saml" | "scim" | "domain_verification";

/** A connection's state, as the server accepts it (any other is refused). */
export type SamlStatus = "draft" | "active" | "disabled";

/** What the link may set up, for which organisation, until when. */
export type PortalContext = Schemas<"federation">["PortalContext"];

// The fields of a connection the pages read; the server always sends them (saml.Connection).
const CONNECTION_FIELDS = [
  "id",
  "name",
  "status",
  "idp_entity_id",
  "idp_sso_url",
  "email_attribute",
  "name_attribute",
  "created_at",
] as const;

/** A SAML connection, with the service-provider addresses its identity provider needs. */
export type SamlConnection = WithRequired<
  Schemas<"federation">["AdminPortalSAMLConnection"],
  (typeof CONNECTION_FIELDS)[number]
>;

const connection = (record: Schemas<"federation">["AdminPortalSAMLConnection"]) =>
  assured(record, ...CONNECTION_FIELDS);

/** The fields a SAML connection is created or changed with. */
export type SamlConnectionInput = Body<"/v1/admin-portal/saml/{id}", "patch">;

export type SamlTestResult = Schemas<"federation">["TestResult"];

/** A test sign-in in this browser, and what the identity provider asserted once it answered. */
export type SamlTestSignIn = Schemas<"federation">["SAMLTestSignIn"];

/** One of the organisation's email domains, with the DNS record that proves it owns it. */
export type PortalDomain = Schemas<"federation">["Domain"];

export type ScimConfig = Schemas<"federation">["ConfigView"];

/** Trades the link's one-time credential for the portal-session cookie, once. */
export function exchangePortalSession(token: string) {
  return backend.post("/v1/admin-portal/session", { bearer: token });
}

// The GET document leaves every field optional; the server answers the same PortalContext as
// the session exchange (internal/federation/adminportal/portal_context.go).
export async function fetchPortalContext(): Promise<PortalContext> {
  const ctx = assured(
    await backend.get("/v1/admin-portal/context"),
    "organization_name",
    "capabilities",
    "expires_at",
  );
  return { ...ctx, capabilities: [...ctx.capabilities] };
}

export async function listSamlConnections(): Promise<SamlConnection[]> {
  return assuredItems((await backend.get("/v1/admin-portal/saml")).items, ...CONNECTION_FIELDS);
}

/** A name alone makes a draft, answered with the addresses the identity provider needs. */
export async function createSamlConnection(
  input: Body<"/v1/admin-portal/saml", "post">,
): Promise<SamlConnection> {
  return connection(await backend.post("/v1/admin-portal/saml", { body: input }));
}

export async function updateSamlConnection(
  id: string,
  input: SamlConnectionInput,
): Promise<SamlConnection> {
  return connection(
    await backend.patch("/v1/admin-portal/saml/{id}", { path: { id }, body: input }),
  );
}

export function testSamlConnection(id: string) {
  return backend.post("/v1/admin-portal/saml/{id}/test", { path: { id } });
}

/** Begins a test sign-in: the answer carries the identity provider's address to open. */
export function beginSamlTestSignIn(id: string) {
  return backend.post("/v1/admin-portal/saml/{id}/test-sign-ins", { path: { id } });
}

export function getSamlTestSignIn(id: string, testId: string) {
  return backend.get("/v1/admin-portal/saml/{id}/test-sign-ins/{testID}", {
    path: { id, testID: testId },
  });
}

export async function deleteSamlConnection(id: string): Promise<void> {
  await backend.delete("/v1/admin-portal/saml/{id}", { path: { id } });
}

export async function listDomains(): Promise<PortalDomain[]> {
  return (await backend.get("/v1/admin-portal/domains")).items ?? [];
}

export function addDomain(domain: string) {
  return backend.post("/v1/admin-portal/domains", { body: { domain } });
}

export function verifyDomain(id: string) {
  return backend.post("/v1/admin-portal/domains/{id}/verify", { path: { id } });
}

/** Sends the domain's people to the identity provider when they sign in, or stops it. */
export function setDomainSSO(id: string, ssoEnabled: boolean) {
  return backend.patch("/v1/admin-portal/domains/{id}", {
    path: { id },
    body: { sso_enabled: ssoEnabled },
  });
}

export function getScimConfig() {
  return backend.get("/v1/admin-portal/scim");
}

export function rotateScimToken() {
  return backend.post("/v1/admin-portal/scim/token");
}

export async function revokeScimToken(): Promise<void> {
  await backend.delete("/v1/admin-portal/scim/token");
}
