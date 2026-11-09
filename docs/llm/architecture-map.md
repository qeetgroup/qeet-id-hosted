# Architecture Map — qeet-id-hosted

**Level:** L2 · **Last verified:** 2026-10-24
**Verification scope:** every path confirmed to exist.

| Need | Path |
|---|---|
| Repository identity | [`qeet-repo.yml`](../../qeet-repo.yml) |
| Agent instructions | [`AGENTS.md`](../../AGENTS.md) |
| **API client, CSRF seeding** | `src/platform/api/client.ts` |
| Login context (app name, logo and home page, tenant policy, branding) | `src/platform/api/login-context.ts`; server pages use `getLoginContext` in `src/platform/api/server.ts` |
| **Return-to validation (open-redirect guard)** | `src/platform/navigation/return-to.ts` |
| Enterprise-setup client (backend `/v1/admin-portal/*`) | `src/modules/enterprise-setup/api/admin-portal.ts` |
| Branding normalisation and CSS variables | `src/platform/branding/branding.ts` |
| Root layout | `src/app/layout.tsx` |
| Root redirect → `/sign-in` | `src/app/page.tsx` |
| Error pages: not found · failed page · failed root layout | `src/app/{not-found,error,global-error}.tsx` → `src/platform/components/{not-found-page,error-page}.tsx` |
| Runtime config written into every page | `src/app/layout.tsx` → `publicConfigScript` in `src/platform/config/public-config.ts` |
| Former paths (`/login`, `/signup`, …) → current ones | `next.config.ts` `redirects()` |
| Global styles | `src/app/globals.css` |
| Page frame: the three layouts (phone, tablet card, laptop two columns), a page of its own with a top bar · the footer (language, theme, legal links) · the logo | `src/platform/components/hosted-page.tsx` · `page-footer.tsx` · `brand-logo.tsx` · `qeet-id-logo.tsx` |
| Shared parts: the account, the application, or-divider, a ruled list of choices, a form message | `src/platform/components/{account-chip,app-line,form-parts,form-alert}.tsx` |
| Icons (sharp, mirrored in right-to-left) | `src/platform/icons.ts` |
| An organisation's colour on Qeetrix's brand tokens | `src/platform/branding/branding.ts` · `.hosted-branded` in `src/app/globals.css` |
| Light / dark / system theme: Qeetrix provider, pre-paint script, storage key | `src/app/layout.tsx` · `src/platform/components/providers.tsx` · `src/platform/config/theme.ts` |
| Favicon and Apple touch icon (Next.js file convention) | `src/app/icon.svg` · `src/app/apple-icon.png` |

## Routes — every segment

Each route is `src/app/(<group>)/<route>/page.tsx`, which reads the URL and renders the module page
named here. Groups don't change the URL: `(auth)` holds the sign-in journeys, `(account)` the
signed-in self-service pages, `(enterprise)` enterprise setup.

| Route | Module page (`src/modules/…`) | Purpose |
|---|---|---|
| `/sign-in` | `authentication/components/sign-in/` (form, email step, password step, link step, company step, provider row, passkey offer) | email first, then the company's own sign-in when its domain uses one (`company-sign-in.ts`), else password or a sign-in link · passkey · social · the second step · "add a passkey" offer after a password sign-in |
| `/sign-up` | `authentication/components/sign-up/` | account creation + passkey registration |
| `/magic-link` | `authentication/components/magic-link/` | consume an emailed magic link (one requested from hosted sign-in) |
| `/forgot-password` | `recovery/components/forgot-password-*` | request a reset |
| `/reset-password` | `recovery/components/reset-password-*` | set a new password |
| `/consent` | `oauth/components/consent-*` | OAuth consent screen |
| `/device` | `oauth/components/device-*` | device-grant user-code entry |
| `/sign-out` | `sign-out/components/sign-out-*` | confirm a sign-out sent without an `id_token_hint` |
| `/sign-out/done` | `sign-out/components/signed-out-*` | post-sign-out landing, front-channel logout iframes |
| `/security` | `account/components/` | signed-in user's passkeys: list, rename, add (hosted-login session cookie); where sign-in lands with no app to return to |
| `/enterprise-setup` | `enterprise-setup/components/` | one-time fragment exchange, then cookie-authenticated SAML/SCIM self-service |

The MFA steps live in `authentication/components/mfa/`; the session answer types in
`authentication/session.ts`.

## Shared code and i18n

```text
src/platform/     api/ (client · errors · login-context · relay · server) · config/ · navigation/
                  (return-to · go-to) · branding/ · webauthn/ (passkeys) · icons.ts · components/
                  (hosted-page · page-footer · providers · brand-logo · qeet-id-logo · account-chip ·
                  app-line · form-parts · form-alert · error and not-found pages)
src/i18n/         index.ts · provider.tsx · locales/en/{common,consent,device,
                  enterpriseSetup,recovery,security,signIn,signOut,signUp}.json   (English only)
```

## Config

| | |
|---|---|
| Next config — React Compiler, former-path redirects | `next.config.ts` |
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
POST /v1/sso/discovery                where an address signs in (its company's own sign-in?)
GET  /saml/login/{id}?return_to=      company sign-in (SAML), back to /sign-in#saml_code=
GET  /v1/oidc-connections/{id}/login  company sign-in (OpenID Connect), back to /sign-in#oidc_code=
POST /saml/session                    trade the SAML code for the session
POST /v1/oidc-connections/session     trade the OpenID Connect code for the session
POST /ldap/{id}/session               a company directory's user name and password
POST /v1/oauth/authorize/decision     consent
GET  /v1/oauth/device?user_code=      device grant
POST /v1/oauth/device/decision
GET  /v1/oauth/login-context          per-tenant branding
POST /v1/admin-portal/session        one-time fragment-token exchange
     /v1/admin-portal/...            cookie-authenticated context · saml · scim · scim/token
```

The contract is owned by **`qeet-id-server`**.

## Security headers and startup

| Need | Path |
|---|---|
| Each page's Content-Security-Policy and nonce | `src/proxy.ts` → `src/platform/security/content-security-policy.ts` |
| Headers on every response (Referrer-Policy, nosniff, X-Frame-Options, Permissions-Policy) | `src/platform/security/security-headers.ts`, applied in `next.config.ts` |
| Startup check on the server's settings | `src/instrumentation.ts` → `src/platform/config/server-config.ts` |
| Browser tests: CSP and accessibility | `tests/e2e/`, `playwright.config.ts` |

## CI and releases

| Need | Path |
|---|---|
| Verify on every pull request (checks + browser tests; promotions skip what's already tested) | `.github/workflows/ci.yml` |
| The kit's test image, built when `release` changes | `.github/workflows/candidate.yml`, `Dockerfile` |
| Production deploy, tag, `release` and `develop` brought level with `main` | `.github/workflows/deploy.yml` |
| The next release's version (from pull request titles: `feat!` major, `feat` minor, else patch) | `scripts/next-version.sh` |
| Dependency updates (weekly, grouped, into `develop`) | `.github/dependabot.yml` |
