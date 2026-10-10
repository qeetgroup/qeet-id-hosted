# Boundaries — qeet-id-login

**Level:** L2 · **Last verified:** 2026-09-05
**Verification scope:** ownership from `qeet-id-context/REPOSITORIES.md`; endpoint list and auth
model read from source.

## Owns

The interactive authentication UI at `login.id.qeet.in`: login, signup, recovery, MFA entry, OAuth
consent, device-grant user-code entry, and the external admin portal. Per-tenant branding
application. Client-side redirect safety.

## Does not own

| Not owned | Owner |
|---|---|
| **Credential verification, MFA policy, lockout** | `qeet-id-server` |
| **Token issuance and session lifetime** | `qeet-id-server` |
| Consent recording | `qeet-id-server` |
| Admin-portal token issuance and scoping | `qeet-id-server` |
| The API contract | `qeet-id-server` |
| Operator UI | `qeet-id-console` |
| Magic-link **consumption** | `qeet-id-console` |
| Marketing | `qeet-id-website` |
| The design system | `qeetrix-ui` |

## Consumes

`api.id.qeet.in` over HTTPS with `credentials: "include"` and a CSRF double-submit header ·
`@qeetrix/ui`. **No database, no server-side secret, no state.**

## Provides

Rendered HTML and a browser session **established by the backend**. It provides no API and no
package. Its outward contract is the set of `/v1/...` endpoints it calls.

## Security boundaries

**The trust boundary is `qeet-id-server`.** This app runs in a hostile environment with no secret.

| Boundary | Enforcement |
|---|---|
| Session | Backend HttpOnly cookies: `qe_ls` for login and a path-scoped admin-portal session |
| CSRF | `qe_csrf` echoed as `X-CSRF-Token` on mutations |
| Redirect | `safeReturnTo` on every `window.location.href` |
| MFA challenge | `mfa_token` in memory only — **never the URL** |
| Admin portal | One-time fragment credential exchanged for a short-lived HttpOnly session |
| Build-time config | `NEXT_PUBLIC_*` only — treat every value as public |

### The admin-portal exception

`/admin-portal#token=...` carries a one-time credential in the fragment. The client clears that
fragment immediately and exchanges the credential at `POST /v1/admin-portal/session`; all later
requests use token-free paths and the backend's HttpOnly, SameSite=Strict portal-session cookie.

Handling rules, without exception: **never store it · never place it in a path or query string ·
never include it in React state, logs, error messages, telemetry, or analytics.**

## Cross-repository dependencies

```text
qeet-id-server ──contract + sets qe_ls──►  qeet-id-login
qeetrix-ui     ──@qeetrix/ui──────────►  qeet-id-login
every Qeet product ──OIDC redirect────►  qeet-id-login
```

**Everything redirects here.** This app initiates no contract but is the destination of the
organization's entire SSO model.

## Safe to change without coordination

UI copy, layout and styling · i18n strings · a new component composed from existing endpoints ·
accessibility improvements · error-message copy (as long as it uses codes, not backend messages).

## Requires cross-repository coordination

| Change | Reaches |
|---|---|
| **CSRF cookie or header name** | `qeet-id-server` **and** `qeet-id-react` — all three must agree |
| Session cookie assumptions | `qeet-id-server` sets `qe_ls` |
| **Calling a new endpoint** | Must exist in `qeet-id-server` first |
| A new auth flow | `qeet-id-server`, and usually `qeet-id-context/FLOWS/` |
| Hostname or port | Backend `LOGIN_BASE_URL`, `ALLOWED_ORIGINS`, `WEBAUTHN_RP_ORIGINS`, `qeet-id-deploy` |
| Consent screen fields | `qeet-id-server` owns the scope list |
| `@qeetrix/ui` major upgrade | `qeetrix-ui` — pinned `^1.0.2` against npm `2.0.0` |

Product-level fan-out: `qeet-id-context/CHANGE-MATRIX.md`.

## Hard limits

1. **Never store a token** — not in storage, not in a cookie, not in state.
2. **Never weaken CSRF**, and never add a skip flag.
3. **Never redirect to an unvalidated URL.** An open redirect here is a phishing primitive.
4. **Never log or expose an admin-portal token.**
5. **Never put the MFA challenge token in the URL.**
6. **Never add a server-side secret** — this app is stateless by design.
7. **Never call an endpoint you have not verified** in `qeet-id-server`.
8. **Never change another repository** from a task scoped to this one.
