# Repository Context — qeet-id-hosted

**Level:** L2 · **Status:** active · **Evidence state:** verified · **Last verified:** 2026-10-24
**Verification scope:** routes, API client, CSRF behaviour and endpoint list read from source.
Port requirement cross-checked against `qeet-id-server`'s `.env.example`.

## Identity

The **hosted authentication UI for Qeet ID**, served at `accounts.id.qeet.in`. Next.js 16.2.6 App
Router, React 19 with the React Compiler, Tailwind v4, `@qeetrix/ui 2.1.5` + `@qeetrix/icons 1.0.11`,
bun 1.3.14.
33 source files, ~2.9k LOC.

**Deliberately thin.** Its README: *"a thin, stateless front-end: every action calls the Qeet ID
backend API; this app holds no database and no secrets."*

## Context inheritance

```text
qeet-context (L0)  →  qeet-id-context (L1)  →  qeet-id-server (contract + enforcement)
                                            →  qeet-id-hosted (L2 — this document)
```

## Why this repository matters more than its size suggests

**It is the only host where an interactive Qeet ID session is established.** Every other Qeet
product — and every external relying party — redirects here over OIDC. The organization's
cross-product SSO model depends on that being the single point of interactive authentication.

**Evidence:** `qeet-context/DOMAIN.md`, `qeet-id-context/FLOWS/oauth-oidc.md`.

## Responsibilities

Rendering the interactive flows: password, passkey, social, MFA (TOTP + recovery code), signup with
passkey registration, forgot/reset password, **OAuth consent**, **device-grant user-code entry**, and
**enterprise setup** for an external IT administrator. Applying per-tenant branding.

## Non-responsibilities

**It decides nothing.** Credential verification, MFA policy, token issuance, consent recording and
session lifetime all belong to `qeet-id-server`. It holds no state, no database, no secret.

**Magic links are split by where they were requested.** One asked for from hosted sign-in lands on
`/magic-link` here; one asked for from the console still lands in `qeet-id-console`. Worth knowing
before looking for it.

## Architecture

```text
browser
  ↓  credentials: "include"  +  X-CSRF-Token on cookie-authenticated mutations
src/platform/api/client.ts   the single client
  ↓
api.id.qeet.in
  ↓
backend sets scoped HttpOnly login or enterprise-setup cookies
```

Server components fetch per-tenant branding per page via
`GET /v1/oauth/login-context?client_id=…` (`getLoginContext` in `src/platform/api/server.ts`), so a user sees their own
organization's identity before signing in.

## Session and CSRF

**Evidence:** `src/platform/api/client.ts`

The file's own header comment states the model:

> *"this app is cookie-based: the backend sets the HttpOnly SSO cookie (`qe_ls`), so every request
> uses `credentials: "include"`. Mutations echo the CSRF double-submit token."*

| Concern | Behaviour |
|---|---|
| Session | Backend-set HttpOnly cookies: `qe_ls` for login and a path-scoped portal cookie |
| CSRF | `qe_csrf` cookie echoed as `X-CSRF-Token` on POST/PATCH/DELETE |
| Seeding | If `qe_csrf` is absent, fire `GET /healthz` with credentials, then retry |
| GET | No CSRF header |
| Errors | `ApiError { status, code, message }` parsed from `{error:{code,message}}` |

The cookie and header names must match `qeet-id-server` **and** `qeet-id-react`, which implements the
identical contract.

**MFA:** `POST /v1/auth/session` may return `mfa_required` with an `mfa_token`. That token is held
**in React memory only and never placed in the URL**, then exchanged at `/v1/auth/session/mfa` with a
`remember` flag.

## Enterprise setup — the highest-risk surface here

`/enterprise-setup` lets an IT administrator at a **customer** configure SAML or SCIM **without a Qeet
ID account**; the backend still calls it the admin portal (`/v1/admin-portal/*`). A generated link contains a one-time credential in its URL fragment, which browsers
do not send in HTTP requests.

```text
tenant admin generates a capability-scoped, time-limited link
  ↓
accounts.id.qeet.in/enterprise-setup#token=...   (generated as /admin-portal#token=..., redirected)
  ↓  clear fragment, then one-time bearer exchange
POST /v1/admin-portal/session
  ↓  short-lived HttpOnly, SameSite=Strict portal session
/v1/admin-portal/{context,saml,scim,scim/token}
```

The client reads the link token into a local effect variable, removes the fragment before its first
network request, and exchanges it exactly once. It never stores the token in React state, browser
storage, a cookie, a path, or a query string. All subsequent requests use token-free paths, the
backend's HttpOnly portal-session cookie, and normal CSRF protection.

Backend-side the link is capability-scoped (`saml` or `scim`), one-time, and bounded (15 minutes to
24 hours, 1 hour default). The derived portal session lasts at most 30 minutes and is invalidated
immediately when its parent link is revoked.

## Redirect safety

`safeReturnTo(returnTo)` guards every `window.location.href` assignment (made through `goTo` in
`src/platform/navigation/go-to.ts`). It allows two things only: the API's own `/oauth/authorize` URL, and a
root-relative path to an allowed hosted-login page (`LOCAL_RETURN_PATHS`, today `/device`), checked
as given and once decoded for `//` and backslashes. **An open redirect on the sign-in host is a
phishing primitive** — it is the one page a user is trained to trust with credentials. Always route
a candidate URL through it, and add a hostile case to `src/platform/navigation/__tests__/return-to.test.ts` with any change.

## Configuration

`NEXT_PUBLIC_API_URL`, default `http://localhost:4001`; production `https://api.id.qeet.in`.
`NEXT_PUBLIC_*` variables are **inlined at build time and are therefore public.** The one
server-side secret is the optional relay key: with `QEET_ID_RELAY_KEY` (the value the API lists in
`RELAY_KEYS`) and `LOGIN_TRUSTED_PROXY_HOPS`, server pages name the visitor's address to the API
(`X-Qeet-Relay-Key` + `X-Qeet-Client-IP`) when they fetch `/v1/oauth/login-context`. Without it,
nothing is relayed.

## Local development

```bash
bun run dev -- -p 3003
```

**3003 is required, not a preference.** `bun run dev` alone binds 3000. `qeet-id-server`'s
`.env.example` sets `LOGIN_BASE_URL=http://localhost:3003` and allowlists 3003 in `ALLOWED_ORIGINS`
and `WEBAUTHN_RP_ORIGINS`. On any other port, passkey ceremonies fail and OAuth redirects point at
the wrong host.

## Testing and CI

`bun run test` runs the Vitest suite: unit tests for `src/platform` (including `safeReturnTo`, the
Content-Security-Policy and the startup check) and component tests for the forms and pages. Component tests use
jsdom, render through `src/testing/render.tsx` (the app's theme provider), answer API calls with `mockApi`
(`src/testing/mock-api.ts`), and mock `goTo`
(`src/platform/navigation/go-to.ts`) to see where a flow sends the browser. `ci.yml` runs typecheck, Biome
(`bun run check`), tests and the build on every PR; `deploy.yml` runs the same checks before the
Vercel deploy. The **Browser tests** job (`bun run test:e2e`) opens every page of the production build in
Chromium and fails on any Content-Security-Policy violation or axe WCAG 2.2 AA finding, in the light and dark
themes.

## Security-critical areas

| Area | Path | Risk | Review |
|---|---|---|---|
| CSRF handling, seeding | `src/platform/api/client.ts` | **Critical** | Security review |
| Enterprise-setup exchange and cookie calls | `src/modules/enterprise-setup/components/enterprise-setup-page.tsx`, `src/modules/enterprise-setup/api/admin-portal.ts` | **Critical** | Security review |
| Redirect validation | `safeReturnTo` usage | **Critical** | Security review |
| MFA token handling | `src/modules/authentication/components/sign-in/sign-in-form.tsx` | High | Review — memory only |
| Branding injection | `src/platform/branding/branding.ts` | Medium | Review |
| Content-Security-Policy and security headers | `src/proxy.ts`, `src/platform/security/` | **Critical** | Security review |

## Known constraints

- **Coverage is about 64%** of statements; the floor in `vitest.config.mts` stops it dropping. The
  server-rendered page wrappers are covered only by the browser tests (`tests/e2e`).
- **Port 3003 is load-bearing** and set only by a README instruction, not by configuration.
- `@qeetrix/ui` and `@qeetrix/icons` are **pinned exactly** (`2.1.5`, `1.0.11`): their releases
  have removed exports in patch versions, so a caret range is not safe. Social-provider buttons
  keep `@thesvg/react` — `@qeetrix/icons` ships no third-party brand marks.
- Server Components import `@qeetrix/ui` by subpath (`@qeetrix/ui/providers/theme-provider`),
  never the package root: the root barrel there ships the whole library to every page.
- i18n is **English only** — `src/i18n/locales/en/` is the only locale.
- `.env.example` is tracked despite `.gitignore` covering `.env*` — it was added before the rule.

## Documentation authority

Source > `qeet-id-server`'s handlers > README. Product-level flow narratives live in
`qeet-id-context/FLOWS/`; this document explains only where they are implemented here.
