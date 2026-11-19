// What the server sends or accepts that its API documents leave out, keyed `METHOD path`. Each entry
// names the server code that shows it, is reported for the document, and goes once the document has
// it; `bun run contract:check` prints how many are left. Never add a field the server lacks.
import type * as access from "./generated/access.gen";

type MFAChallenge = access.components["schemas"]["MFAChallenge"];

/**
 * Per operation: `answer` fields its success answer also carries, `alsoAnswers` a success answer
 * the document doesn't list at all, `body` fields it accepts, and `partial` when the server takes
 * any part of a body the document lists in full.
 */
export type Undocumented = {
  // internal/access/authentication/http_loginsession.go, destroySession: 204 without applications
  // to sign out of, else 200 with their front-channel sign-out addresses.
  "DELETE /v1/auth/session": { alsoAnswers: { frontchannel_logout_uris?: string[] } };
  // internal/federation/oidc/http.go, loginContext: always sends providers, the organisation's
  // self-registration and remember-device switches, and the sign-in methods it allows.
  "GET /v1/oauth/login-context": {
    answer: {
      providers: string[];
      self_registration_enabled: boolean;
      remember_device_enabled: boolean;
      sign_in_methods: { password: boolean; passkey: boolean; magic_link: boolean };
    };
  };
  // internal/federation/ldap/http.go, sessionHTTP: the session (user_id, cookie set), or the
  // second-step challenge when the account has one or must set one up.
  "POST /ldap/{id}/session": { answer: { user_id: string } | MFAChallenge };
  // internal/federation/adminportal/portal_saml.go, samlUpdate: saml.UpdateInput, every field a
  // pointer; the document gives the create body, whose name is required.
  "PATCH /v1/admin-portal/saml/{id}": { partial: true };
};
