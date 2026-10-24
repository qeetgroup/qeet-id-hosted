# Qeet ID — Hosted Login

The **hosted authentication UI** for [Qeet ID](https://github.com/qeetgroup/qeet-id-server) —
the passkeys-first identity platform. This is the branded, centralized set of pages the Qeet ID
OAuth/OIDC **authorize** flow redirects users to for sign-in, sign-up, consent, and account
recovery. It is a thin, stateless front-end: every action calls the Qeet ID backend API; this app
holds no database and no secrets.

- **Stack:** Next.js 16 (App Router) · React 19 + React Compiler · TypeScript · `@qeetrix/ui` · i18next
- **Runtime:** static/SSR on Vercel · talks only to the Qeet ID API (`NEXT_PUBLIC_API_URL`)
- **Prod:** [`https://login.id.qeet.in`](https://login.id.qeet.in) → API `https://api.id.qeet.in`

---

## Screens

Each route is a self-contained step in the hosted-auth journey (`src/app/`):

| Route | Purpose |
|---|---|
| `/sign-in` | Sign in — password, **passkey / WebAuthn**, social, magic-link, OTP, and MFA step-up |
| `/sign-up` | Create an account |
| `/forgot-password` | Request a password-reset email |
| `/reset-password` | Set a new password from a reset link |
| `/magic-link` | Finish signing in from an emailed magic link |
| `/consent` | OAuth **consent** screen shown during the authorize flow |
| `/device` | **Device authorization** grant — enter the user code from a TV/CLI |
| `/enterprise-setup` | SAML/SCIM setup for an invited external IT admin, with no Qeet ID account (the backend's admin portal) |
| `/sign-out` | Confirm a sign-out that didn't name its session |
| `/sign-out/done` | Post-sign-out landing |
| `/security` | The signed-in user's passkeys — see, rename and add one (also offered after a password sign-in) |

The former paths — `/login`, `/signup`, `/logout`, `/logged-out`, `/reset`, `/magic`, `/admin-portal` — redirect to
these (query and fragment kept), because `qeet-id-server` and already-sent emails still link to
them ([`next.config.ts`](next.config.ts)).

---

## Getting started

**Prerequisites:** [Bun](https://bun.sh) `1.3+` and a running Qeet ID backend
([`qeet-id-server`](https://github.com/qeetgroup/qeet-id-server), local default `:4001`).

```bash
bun install
cp .env.example .env.local     # then set NEXT_PUBLIC_API_URL if not using the default

# Run on :3003 to match the backend's dev WebAuthn/CORS origins
bun run dev -- -p 3003         # http://localhost:3003
```

> `bun run dev` alone starts Next.js on `:3000`. The workspace reserves **`:3003`** for the login
> app, and the backend's dev config allow-lists `http://localhost:3003` for CORS and passkey
> ceremonies — so use `-p 3003` when testing sign-in end-to-end.

### Scripts

| Command | Does |
|---|---|
| `bun run dev` | Next dev server (add `-- -p 3003`) |
| `bun run build` | Production build (`next build`) |
| `bun run start` | Serve the production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Unit and component tests (`vitest run`) |
| `bun run test:coverage` | The same, held to the coverage floor in `vitest.config.ts` (CI) |
| `bun run test:e2e` | Build, then every page in Chromium: its Content-Security-Policy and a WCAG 2.2 AA scan |
| `bun run check` | Biome: formatting, lint and import order (what CI runs) |
| `bun run lint` | Biome lint only |
| `bun run format` | Biome: rewrite formatting in place |

### Tests

`bun run test` runs the whole suite once with Vitest; it needs no server and no `.env`.
Tests live in a `__tests__/` folder beside the code they cover, as `*.test.ts(x)`. Component tests start with
`// @vitest-environment jsdom`, import `@/i18n`, and answer API calls with `mockApi` from
`src/testing/mock-api.ts`, never a live server. A flow that leaves the page goes through `goTo`
(`src/platform/navigation/go-to.ts`), which tests mock to see where the browser is sent.
`bunx vitest` watches while you work.

---

## Configuration

Next.js inlines `NEXT_PUBLIC_*` at **build time**, so only public, non-secret values may carry that prefix.
The two relay settings are read only on the server and never reach the browser.

| Variable | Required | Example (dev) | Prod |
|---|:--:|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:4001` | `https://api.id.qeet.in` |
| `QEET_ID_RELAY_KEY` | — | — | one of the API's `RELAY_KEYS` (server-only secret) |
| `LOGIN_TRUSTED_PROXY_HOPS` | — | `0` | proxies in front of the app that append to `X-Forwarded-For` |

The app appends `/v1/...` to the API URL itself.

---

## Project structure

```
src/
  app/          routes only, grouped by audience: (auth) · (account) · (enterprise);
                layout.tsx, the error and not-found pages, globals.css
  modules/      one folder per product area: authentication · recovery · sign-out · oauth ·
                account · enterprise-setup (components, tests, and an API client where needed)
  platform/     shared by the modules: API client, config, navigation, branding, passkeys, page shell
  i18n/         i18next setup + every locale file
  testing/      Vitest setup and the API mock
biome.json      formatter, linter and the import rules that keep this layout
next.config.ts  reactCompiler: true · transpilePackages: ["@qeetrix/ui"] · old-path redirects
```

The conventions and what enforces them: [AGENTS.md](AGENTS.md).

---

## How it fits the platform

This app is **presentation only** — the backend owns all auth logic:

- **API** — every call goes to `NEXT_PUBLIC_API_URL`; the backend must allow this origin via CORS
  (`ALLOWED_ORIGINS` includes `https://login.id.qeet.in` in prod).
- **Passkeys / WebAuthn** — ceremonies are validated against the backend's Relying Party config.
  Because passkeys are used on both `login.id.qeet.in` and `console.id.qeet.in`, the backend must set
  `WEBAUTHN_RP_ID=id.qeet.in` and list both origins in `WEBAUTHN_RP_ORIGINS` (the parent domain
  covers both sub-domains).
- **OIDC** — the OAuth authorize flow redirects here; the relying-party client's `redirect_uri`s must
  include the prod login/console URLs.

---

## Deployment (Vercel)

Deployed as a standard **Next.js** project on Vercel (auto-detected — no framework config needed).
[`vercel.json`](vercel.json) only pins the Bun install/build commands:

```json
{ "installCommand": "bun install --frozen-lockfile", "buildCommand": "bun run build" }
```

**Steps**

1. Import `qeetgroup/qeet-id-hosted` in Vercel (Framework Preset auto-detects **Next.js**).
2. Environment variables (Production + Preview):
   ```
   NEXT_PUBLIC_API_URL=https://api.id.qeet.in
   ```
3. Deploy.
4. Add the custom domain **`login.id.qeet.in`** → create the CNAME Vercel provides in GoDaddy
   (`login.id` → `cname.vercel-dns.com`).

`@qeetrix/ui` resolves from the public npm registry, so a standalone install needs no monorepo.

---

## Related repositories

| Repo | Role |
|---|---|
| [`qeet-id-server`](https://github.com/qeetgroup/qeet-id-server) | Backend API (Go) — auth, OIDC, WebAuthn |
| [`qeet-id-console`](https://github.com/qeetgroup/qeet-id-console) | Admin console (TanStack Start) — `console.id.qeet.in` |
| [`qeet-id-website`](https://github.com/qeetgroup/qeet-id-website) | Marketing site — `id.qeet.in` |
| `qeet-id-deploy` | Infrastructure + CD for the backend (Terraform) |

Built on the shared **`@qeetrix/ui`** design system. Part of the [Qeet Group](https://github.com/qeetgroup) suite.
