// The enterprise setup (admin portal) client. The link's one-time credential, read from the URL
// fragment, is exchanged once for the server's HttpOnly portal-session cookie; every later call is
// token-free and CSRF-protected. Names follow the server's routes (/v1/admin-portal/*).

import { apiDelete, apiExchangeBearer, apiGet, apiPatch, apiPost } from "@/platform/api/client";
import type { BrandingDTO } from "@/platform/branding/branding";

export type AdminPortalCapability = "saml" | "scim" | "domain_verification";

export interface PortalContext {
  tenant_name: string;
  capabilities: AdminPortalCapability[];
  expires_at: string;
  branding?: BrandingDTO;
  /** Where the identity provider provisions to; only for a link that may set up SCIM. */
  scim_base_url?: string;
}

export type SamlStatus = "draft" | "active" | "disabled";

/** A SAML connection, with the service-provider addresses its identity provider needs. */
export interface SamlConnection {
  id: string;
  name: string;
  idp_entity_id: string;
  idp_sso_url: string;
  email_attribute: string;
  name_attribute: string;
  status: SamlStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  sp_entity_id?: string;
  acs_url?: string;
  sp_metadata_url?: string;
}

export interface SamlConnectionInput {
  name?: string;
  idp_entity_id?: string;
  idp_sso_url?: string;
  idp_certificate?: string;
  email_attribute?: string;
  name_attribute?: string;
  status?: SamlStatus;
}

export interface SamlTestResult {
  ok: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
}

/** A test sign-in in this browser, and what the identity provider asserted once it answered. */
export interface SamlTestSignIn {
  id: string;
  connection_id: string;
  status: "pending" | "succeeded" | "failed" | "expired";
  redirect_url?: string;
  error_code?: string;
  error_message?: string;
  error_detail?: string;
  name_id?: string;
  name_id_format?: string;
  email?: string;
  name?: string;
  attributes?: { name: string; friendly_name?: string; values: string[] }[];
  email_domain_verified?: boolean;
}

/** One of the organisation's email domains, with the DNS record that proves it owns it. */
export interface PortalDomain {
  id: string;
  domain: string;
  dns_record_name: string;
  dns_record_type: string;
  dns_record_value: string;
  verified_at?: string;
  status: "verified" | "pending" | "attention";
  sso_enabled: boolean;
}

export interface ScimConfig {
  token_set: boolean;
  token_prefix?: string;
  created_at?: string | null;
  last_used_at?: string | null;
  provisioned_count: number;
}

interface PortalSessionResponse {
  context: PortalContext;
  expires_at: string;
  redirect_url: string;
}

export function exchangePortalSession(token: string) {
  return apiExchangeBearer<PortalSessionResponse>("/v1/admin-portal/session", token);
}

export function fetchPortalContext() {
  return apiGet<PortalContext>("/v1/admin-portal/context");
}

export function listSamlConnections() {
  return apiGet<{ items: SamlConnection[] }>("/v1/admin-portal/saml");
}

/** A name alone makes a draft, answered with the addresses the identity provider needs. */
export function createSamlConnection(input: SamlConnectionInput) {
  return apiPost<SamlConnection>("/v1/admin-portal/saml", input);
}

export function updateSamlConnection(id: string, input: SamlConnectionInput) {
  return apiPatch<SamlConnection>(`/v1/admin-portal/saml/${encodeURIComponent(id)}`, input);
}

export function testSamlConnection(id: string) {
  return apiPost<SamlTestResult>(`/v1/admin-portal/saml/${encodeURIComponent(id)}/test`);
}

/** Begins a test sign-in: the answer carries the identity provider's address to open. */
export function beginSamlTestSignIn(id: string) {
  return apiPost<SamlTestSignIn>(`/v1/admin-portal/saml/${encodeURIComponent(id)}/test-sign-ins`);
}

export function getSamlTestSignIn(id: string, testId: string) {
  return apiGet<SamlTestSignIn>(
    `/v1/admin-portal/saml/${encodeURIComponent(id)}/test-sign-ins/${encodeURIComponent(testId)}`,
  );
}

export function deleteSamlConnection(id: string) {
  return apiDelete<void>(`/v1/admin-portal/saml/${encodeURIComponent(id)}`);
}

export function listDomains() {
  return apiGet<{ items: PortalDomain[] }>("/v1/admin-portal/domains");
}

export function addDomain(domain: string) {
  return apiPost<PortalDomain>("/v1/admin-portal/domains", { domain });
}

export function verifyDomain(id: string) {
  return apiPost<PortalDomain>(`/v1/admin-portal/domains/${encodeURIComponent(id)}/verify`);
}

/** Sends the domain's people to the identity provider when they sign in, or stops it. */
export function setDomainSSO(id: string, ssoEnabled: boolean) {
  return apiPatch<PortalDomain>(`/v1/admin-portal/domains/${encodeURIComponent(id)}`, {
    sso_enabled: ssoEnabled,
  });
}

export function getScimConfig() {
  return apiGet<ScimConfig>("/v1/admin-portal/scim");
}

export function rotateScimToken() {
  return apiPost<{ token: string; config: ScimConfig }>("/v1/admin-portal/scim/token");
}

export function revokeScimToken() {
  return apiDelete<void>("/v1/admin-portal/scim/token");
}
