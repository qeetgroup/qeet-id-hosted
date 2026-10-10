// Self-serve Admin Portal client. A URL-fragment credential is exchanged once
// for an HttpOnly session; every subsequent request uses token-free paths.

import { apiDelete, apiExchangeBearer, apiGet, apiPatch, apiPost } from "./api";
import type { BrandingDTO } from "./branding";

export type AdminPortalCapability = "saml" | "scim";

export interface PortalContext {
  tenant_name: string;
  capabilities: AdminPortalCapability[];
  expires_at: string;
  branding?: BrandingDTO;
}

export type SamlStatus = "draft" | "active" | "disabled";

export interface SamlConnection {
  id: string;
  tenant_id: string;
  name: string;
  idp_entity_id: string;
  idp_sso_url: string;
  idp_certificate: string;
  email_attribute: string;
  name_attribute: string;
  status: SamlStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
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

export function createSamlConnection(input: SamlConnectionInput) {
  return apiPost<SamlConnection>("/v1/admin-portal/saml", input);
}

export function updateSamlConnection(id: string, input: SamlConnectionInput) {
  return apiPatch<SamlConnection>(`/v1/admin-portal/saml/${id}`, input);
}

export function testSamlConnection(id: string) {
  return apiPost<SamlTestResult>(`/v1/admin-portal/saml/${id}/test`);
}

export function deleteSamlConnection(id: string) {
  return apiDelete<void>(`/v1/admin-portal/saml/${id}`);
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
