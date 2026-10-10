# Architecture Map — qeet-id-login

**Level:** L2 · **Last verified:** 2026-09-05
**Verification scope:** every path confirmed to exist.

| Need | Path |
|---|---|
| Repository identity | [`qeet-repo.yml`](../../qeet-repo.yml) |
| Agent instructions | [`AGENTS.md`](../../AGENTS.md) |
| **API client, CSRF seeding** | `src/lib/api.ts` |
| Admin-portal client | `src/lib/admin-portal.ts` |
| Per-tenant branding fetch | `src/lib/branding.ts` |
| Root layout | `src/app/layout.tsx` |
| Root redirect → `/login` | `src/app/page.tsx` |
| Global styles | `src/app/globals.css` |

## Routes — every segment

| Route | Files | Purpose |
|---|---|---|
| `/login` | `src/app/login/{page,login-form}.tsx` | password · passkey · social · MFA |
| `/signup` | `src/app/signup/{page,signup-form}.tsx` | account creation + passkey registration |
| `/forgot-password` | `src/app/forgot-password/` | request a reset |
| `/reset` | `src/app/reset/` | set a new password |
| `/consent` | `src/app/consent/` | OAuth consent screen |
| `/device` | `src/app/device/` | device-grant user-code entry |
| `/logged-out` | `src/app/logged-out/` | post-logout landing |
| `/admin-portal` | `src/app/admin-portal/` | One-time fragment exchange, then cookie-authenticated SAML/SCIM self-service |

## Components and i18n

```text
src/components/   auth-card · auth-shell · form-alert · scope-list · social-providers
src/i18n/         index.ts · provider.tsx · locales/en/{common,consent,device,
                  loggedOut,login,recovery,signup}.json      (English only)
```

## Config

| | |
|---|---|
| Next config — React Compiler, transpiles `@qeetrix/ui` | `next.config.ts` |
| Scripts | `package.json` |
| Deploy | `vercel.json` |

## Endpoints this app calls

```text
POST /v1/auth/session                 password login
POST /v1/auth/session/mfa             MFA verification
POST /v1/auth/register                signup
POST /v1/auth/forgot-password         recovery request
POST /v1/auth/reset-password          reset
POST /v1/passkeys/login/{begin,finish}
POST /v1/register/passkey/{begin,finish}
GET  /v1/social/{provider}/start      social redirect
POST /v1/oauth/authorize/decision     consent
GET  /v1/oauth/device?user_code=      device grant
POST /v1/oauth/device/decision
GET  /v1/oauth/login-context          per-tenant branding
POST /v1/admin-portal/session        one-time fragment-token exchange
     /v1/admin-portal/...            cookie-authenticated context · saml · scim · scim/token
```

The contract is owned by **`qeet-id-server`**.

## What does not exist here

**No CI workflow. No tests. No lint or format script.** The Vercel build is the only gate.
Magic-link consumption lives in `qeet-id-console`, not here.
