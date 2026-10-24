# Boundaries — qeet-id-hosted

**Level:** L2 · **Last verified:** 2026-10-24
**Verification scope:** ownership from `qeet-id-context/REPOSITORIES.md`; endpoint list and auth
model read from source.

## Owns

The interactive authentication UI at `login.id.qeet.in`: sign-in, sign-up, recovery, MFA entry, OAuth
consent, device-grant user-code entry, and enterprise setup for an external IT administrator. Per-tenant branding
application. Client-side redirect safety.

## Does not own

| Not owned | Owner |
|---|---|
| **Credential verification, MFA policy, lockout** | `qeet-id-server` |
| **Token issuance and session lifetime** | `qeet-id-server` |
| Consent recording | `qeet-id-server` |
| Enterprise-setup link issuance and scoping (the backend's admin portal) | `qeet-id-server` |
| The API contract | `qeet-id-server` |
| Operator UI | `qeet-id-console` |
| Magic-link **consumption** | `qeet-id-console` |
| Marketing | `qeet-id-website` |
| The design system | `qeetrix-ui` |

## Consumes

`api.id.qeet.in` over HTTPS with `credentials: "include"` and a CSRF double-submit header ·
`@qeetrix/ui` · `@qeetrix/icons`. **No database, no state, and no server-side secret except the
optional relay key** (`QEET_ID_RELAY_KEY`, see `src/platform/api/relay.ts`).

## Provides

Rendered HTML and a browser session **established by the backend**. It provides no API and no
package. Its outward contract is the set of `/v1/...` endpoints it calls.

## Security boundaries

**The trust boundary is `qeet-id-server`.** This app runs in a hostile environment; its only secret is the optional relay key, which lets
the API trust the visitor address it names and grants nothing else.

| Boundary | Enforcement |
|---|---|
| Session | Backend HttpOnly cookies: `qe_ls` for login and a path-scoped enterprise-setup session |
| CSRF | `qe_csrf` echoed as `X-CSRF-Token` on mutations |
| Redirect | `safeReturnTo` on every `window.location.href` |
| Script injection and framing | Per-request nonce CSP (`src/proxy.ts`); `frame-ancestors 'none'` on every page |
| MFA challenge | `mfa_token` in memory only — **never the URL** |
| Enterprise setup | One-time fragment credential exchanged for a short-lived HttpOnly session |
| Build-time config | `NEXT_PUBLIC_*` only — treat every value as public |
| Relay key | `QEET_ID_RELAY_KEY` read only in server pages (`src/platform/api/server.ts`, marked `server-only`); never `NEXT_PUBLIC_*` |

### The enterprise-setup exception

`/enterprise-setup#token=...` (generated as `/admin-portal#token=...`, which redirects) carries a one-time credential in the fragment. The client clears that
fragment immediately and exchanges the credential at `POST /v1/admin-portal/session`; all later
requests use token-free paths and the backend's HttpOnly, SameSite=Strict portal-session cookie.

Handling rules, without exception: **never store it · never place it in a path or query string ·
never include it in React state, logs, error messages, telemetry, or analytics.**

## Cross-repository dependencies

```text
qeet-id-server ──contract + sets qe_ls──►  qeet-id-hosted
qeetrix-ui     ──@qeetrix/ui──────────►  qeet-id-hosted
every Qeet product ──OIDC redirect────►  qeet-id-hosted
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
| `@qeetrix/ui` / `@qeetrix/icons` upgrade | `qeetrix-ui`, `qeetrix-icons` — pinned `2.1.5` / `1.0.11`; re-check tenant branding (`brandingVars`) |

Product-level fan-out: `qeet-id-context/CHANGE-MATRIX.md`.

## Hard limits

1. **Never store a token** — not in storage, not in a cookie, not in state.
2. **Never weaken CSRF**, and never add a skip flag.
3. **Never redirect to an unvalidated URL.** An open redirect here is a phishing primitive.
4. **Never log or expose an enterprise-setup link token.**
5. **Never put the MFA challenge token in the URL.**
6. **Never add a server-side secret** beyond the optional relay key — this app is stateless by design.
7. **Never call an endpoint you have not verified** in `qeet-id-server`.
8. **Never change another repository** from a task scoped to this one.
