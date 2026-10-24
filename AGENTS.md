# AGENTS.md — qeet-id-hosted

**The model-neutral instruction file for coding agents.** [CLAUDE.md](CLAUDE.md),
[GEMINI.md](GEMINI.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md) point
here and add nothing architectural.

## What this repository is

The **hosted authentication UI for Qeet ID** — `accounts.id.qeet.in` (formerly `login.id.qeet.in`). Next.js 16 App Router, React 19
with the React Compiler, Tailwind v4, `@qeetrix/ui`, bun.

> **This is the only host in Qeet where an interactive session is established.** Every other Qeet
> product redirects here over OIDC. That makes a small repository disproportionately important.

Its README states the design directly: *"a thin, stateless front-end: every action calls the Qeet ID
backend API; this app holds no database and no secrets."*

## Context hierarchy

```text
qeet-context (L0)  →  qeet-id-context (L1)  →  qeet-id-server (the contract + all enforcement)
                                            →  qeet-id-hosted (L2 — this repository)
```

## Read before changing code

| File | For |
|---|---|
| [qeet-repo.yml](qeet-repo.yml) | Machine-readable identity |
| [docs/llm/architecture-map.md](docs/llm/architecture-map.md) | "Where is X?" |
| [docs/llm/context.md](docs/llm/context.md) | How this app works |
| [docs/llm/boundaries.md](docs/llm/boundaries.md) | What it owns and must not touch |
| [docs/llm/workflows.md](docs/llm/workflows.md) | Adding a flow or a page |

Product-level flow narratives: `qeet-id-context/FLOWS/`.

## Code layout

```text
src/app/        routes only, grouped by who uses them: (auth) · (account) · (enterprise). Each
                page.tsx reads the URL and renders one module page; error.tsx, global-error.tsx
                and not-found.tsx render the branded error pages from platform/components
src/modules/    one folder per product area (authentication · recovery · sign-out · oauth ·
                account · enterprise-setup), each with components/, __tests__/ and, where it
                needs one, api/
src/platform/   what several modules share: api (client, login context, server-only relay),
                config, navigation (the return-to guard), branding, webauthn, page-shell components
src/i18n/       the i18next setup and every locale file
src/testing/    the Vitest setup, the API mock and the source-file helper
src/proxy.ts    each page's Content-Security-Policy and nonce
src/instrumentation.ts   the startup check on the server's settings
tests/e2e/      Playwright: every page's CSP and an accessibility scan
```

Dependencies point one way: `app → modules → platform → i18n`. A module never imports another
module; what two modules need moves to `platform/`.

## Conventions

One way to do each thing.

| What | Convention | Example |
|---|---|---|
| Routes | kebab-case, one vocabulary (sign-in · sign-up · sign-out); a step of a flow nests under it | `/sign-out/done` |
| Route groups | lowercase, named for who uses them; they don't change the URL | `(auth)` `(account)` `(enterprise)` |
| Route file | `page.tsx`, default export `Page`: reads the URL, renders one module page | `src/app/(auth)/sign-in/page.tsx` |
| Module | kebab-case folder named for a product area | `src/modules/sign-out/` |
| Module page | `<name>-page.tsx` exporting `<Name>Page`: loads data and composes the shell | `sign-in-page.tsx` → `SignInPage` |
| Client form | `<name>-form.tsx` exporting `<Name>Form` | `reset-password-form.tsx` |
| Other files | kebab-case, one exported component per file, named after the file | `passkey-row.tsx` → `PasskeyRow` |
| Hooks | `use-<name>.ts` exporting `use<Name>` | `use-send-cooldown.ts` |
| Tests | `<file>.test.ts(x)` in the `__tests__/` folder beside the code they cover | `src/modules/recovery/__tests__/` |
| Copy | one i18n namespace per flow, camelCase, in `src/i18n/locales/en/` | `signIn`, `signOut` |
| Imports | `@/` across folders, `./` within one, `../` only from `__tests__/`; no barrel files | |
| Backend names | where code mirrors a server contract, it keeps the server's name | `api/admin-portal.ts` |

## What enforces the structure

| Rule | Enforced by |
|---|---|
| The layer direction, and no module importing another | Biome `noRestrictedImports` overrides in `biome.json` (`bun run check`) |
| A route file imports only its module page | Biome override on `src/app/**/page.tsx` |
| `fetch` only inside `src/platform/api/` | Biome `noRestrictedGlobals` |
| No import cycles | Biome `noImportCycles` |
| A source file stays within 500 lines | `src/__tests__/source-files.test.ts` |
| Every translation key the code names exists in English | `src/i18n/__tests__/translation-keys.test.ts` |
| Coverage never drops below the floor | thresholds in `vitest.config.mts` (`bun run test:coverage`, CI) |
| Every page runs under its CSP without a violation, and passes axe WCAG 2.2 AA | `tests/e2e` (`bun run test:e2e`, CI Browser tests) |
| Server-only code (the relay key) never reaches the browser | `import "server-only"` in `src/platform/api/server.ts` fails the build |

Never relax a rule to make a change pass; change the code, or raise it as a decision.

## Rules

### 1. Stay stateless
**No database, no server-side session, and one optional secret.** Configuration is otherwise
public: `NEXT_PUBLIC_*` (inlined at build time) and the runtime `PUBLIC_API_URL`, which
`src/platform/config/public-config.ts` reads per request and the root layout writes into every page.
The single exception is the optional relay key `QEET_ID_RELAY_KEY` (with `LOGIN_TRUSTED_PROXY_HOPS`):
server pages send it with the visitor's address when they fetch `/v1/oauth/login-context`, so the
API does not throttle every visitor as this server's one address (`src/platform/api/relay.ts`). It is read
only on the server, is never `NEXT_PUBLIC_*`, and never reaches the browser; without it the app
behaves as before. Any other secret belongs in `qeet-id-server`.

### 2. Never store a token
Interactive login uses the backend's **HttpOnly `qe_ls`** cookie; enterprise setup uses a separate
HttpOnly cookie. This app cannot read either and must never try. Do not put a token in
`localStorage`, `sessionStorage`, a cookie, or React state.

The pending MFA challenge token is held **in memory only, never in the URL**. Keep it that way. The
one hand-over the server makes through the address — a social sign-in that must meet a second factor
comes back to `/sign-in` with the challenge in the URL **fragment** (never sent to a server or in a
Referer) — is read on load, the fragment cleared at once, and the token then held in memory like any
other (`src/modules/authentication/social-challenge.ts`).

### 3. CSRF is not optional
Every request sets `credentials: "include"`. Mutations read the `qe_csrf` cookie and echo it as
`X-CSRF-Token`, seeding it with `GET /healthz` if absent. GET sends no CSRF header.
**Never add a skip flag.** The cookie and header names must match `qeet-id-server` and
`qeet-id-react`.

### 4. Never redirect to an unvalidated URL
`safeReturnTo(returnTo)` guards every `window.location.href` (via `goTo`). It allows only the API's
own `/oauth/authorize` URL, or a root-relative path to one of this app's allowed pages
(`/device`). An open redirect on the sign-in host is a phishing primitive — **always** run a candidate
URL through it.

### 5. Enterprise setup uses one-time link exchange
`/enterprise-setup` is where an invited external IT administrator configures SAML or SCIM without a
Qeet ID account; the backend still calls it the admin portal (`/v1/admin-portal/*`). The link is
`/enterprise-setup#token=...`; the server still generates `/admin-portal#token=...`, which redirects
here with the fragment intact. The page must remove the fragment immediately and send the token
exactly once as a bearer credential to `POST /v1/admin-portal/session`. The backend then owns the
short-lived HttpOnly portal-session cookie; all later calls use token-free paths and normal CSRF
protection.

Never store the link token, put it in a path/query string/React state, or include it in a log,
error, telemetry event, or analytics event.

### 6. Never invent an endpoint
Verify against the real handler in `qeet-id-server`. This app calls `/v1/...` only.

### 7. Per-tenant branding is server-driven
`GET /v1/oauth/login-context?client_id=…` is fetched in a server component per page. Do not hardcode
tenant branding.

### 8. Every page runs under a strict Content-Security-Policy
`src/proxy.ts` sets each page's policy with a fresh nonce (`src/platform/security/content-security-policy.ts`):
scripts run only with that nonce, and no site may frame a page (`frame-ancestors 'none'`).
Next.js puts the nonce on its own scripts; **any inline `<script>` you add must carry
`nonce={nonce}`** from the root layout, or the browser blocks it. Only `/sign-out/done` may frame
other sites (applications' sign-out pages). The other headers (`Referrer-Policy: no-referrer`, so
reset and magic-link tokens never leave in a Referer; `nosniff`; `X-Frame-Options`;
`Permissions-Policy`) are in `src/platform/security/security-headers.ts`, which also says why HSTS,
`Cross-Origin-Opener-Policy` and `upgrade-insecure-requests` are left out. **Never relax a
directive** to make something load; `bun run test:e2e` fails on any violation.

The server checks its settings once at startup (`src/instrumentation.ts` →
`src/platform/config/server-config.ts`): a malformed `PUBLIC_API_URL`, proxy-hop count or relay key
makes every request fail and the log names the variable.

## Commands

```bash
bun install
bun run dev -- -p 3003     # 3003 is REQUIRED, see below
bun run build
bun run typecheck
bun run test                 # vitest run: unit + component tests, no server needed
bun run test:coverage        # the same, held to the coverage floor — what CI runs
bun run test:e2e             # build, then every page in Chromium: its CSP and a WCAG 2.2 AA scan
bun run check                # Biome: format + lint + import order — what CI runs
bun run format               # Biome: rewrite formatting in place
```

Biome (`biome.json`) is the formatter and linter. A suppression carries a one-line reason
(`// biome-ignore <rule>: <why>`). Tests: see the README's *Tests* section.

> **Run on 3003.** `bun run dev` alone binds 3000. `qeet-id-server`'s `.env.example` sets
> `LOGIN_BASE_URL=http://localhost:3003` and allowlists 3003 for CORS and WebAuthn origins.
> Passkey ceremonies fail on any other port.

## What CI enforces

| Workflow · job | Runs |
|---|---|
| `ci.yml` · `verify` | `bun run typecheck` + `bun run check` + `bun run test:coverage` + `bun run build` — push to `develop`/`release/**`, PRs to `main`/`develop`/`release/**` |
| `ci.yml` · `e2e` | **Browser tests**: `bun run test:e2e` — every page under its Content-Security-Policy without a violation, and an axe WCAG 2.2 AA scan (`tests/e2e`) |
| `ci.yml` · `image` | Push to `release/**` only, after `verify`: `ghcr.io/qeetgroup/qeet-id-login:sha-<commit>` (amd64+arm64) for the Qeet ID Kit (`qeet-id-kit`) — never an RC number. It keeps the repository's former name, which the kit reads, until the kit moves to `qeet-id-hosted` (QTID-955) |
| `deploy.yml` | Push to `main`: typecheck, format and lint, tests, Vercel production deploy, tag |

The container image (`Dockerfile`, Next `output: "standalone"`) is for the test kit; Vercel
production does not use it. Health: `GET /healthz`.

## Before you finish

```bash
bun run typecheck && bun run check && bun run test && bun run build
git diff
```

## Escalate rather than proceed

Storing a token · weakening CSRF · bypassing `safeReturnTo` · logging an enterprise-setup link token ·
adding a server-side secret other than the relay key · relaxing the Content-Security-Policy or a security
header · calling an endpoint that does not exist · anything requiring another repository (file a QTID ticket).
