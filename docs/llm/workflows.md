# Workflows — qeet-id-hosted

**Level:** L2 · **Last verified:** 2026-10-24
**Verification scope:** every command checked against `package.json`; endpoints against `src/`.

## Set up

```bash
bun install
cp .env.example .env.local
bun run dev -- -p 3003
```

> **3003 is required.** `bun run dev` alone binds 3000. The backend allowlists 3003 for CORS and
> WebAuthn; passkeys fail on any other port.

You need `qeet-id-server` running on `:4001` (`make db-up && make dev` there).

## Add or change an auth flow

```text
1  read the product flow      qeet-id-context/FLOWS/authentication.md — what it SHOULD do
2  VERIFY THE ENDPOINT        the real handler in qeet-id-server, not just the OpenAPI doc
3  route + module page        src/app/(<group>)/<route>/page.tsx reads the URL; src/modules/<area>/components/
                             <flow>-page.tsx composes the shell, <flow>-form.tsx is the client form
4  API call                   src/platform/api/client.ts — the single client; mutations get CSRF automatically
5  i18n                       src/i18n/locales/en/<namespace>.json  (English only today)
6  branding                   already applied by the server component — do not hardcode
7  errors                     switch on error.code; never render a backend message
8  bun run typecheck && bun run check && bun run test && bun run build
```

**Never invent an endpoint.** If the flow needs one that does not exist, the work is in
`qeet-id-server`.

## Add a page

```text
1  src/app/(<group>)/<route>/page.tsx   reads the URL only, then renders the module page
                             (auth) sign-in journeys · (account) signed-in self-service · (enterprise)
2  src/modules/<area>/components/<name>-page.tsx   (server component — getLoginContext for branding)
3  a client form component beside it if it needs interactivity, its tests in the module's __tests__/
4  compose from src/platform/components/{auth-card,auth-shell,form-alert}
5  register any new i18n namespace in src/i18n/
6  bun run typecheck && bun run check && bun run test && bun run build
```

## Handle a redirect

```text
1  ALWAYS pass the candidate through safeReturnTo(returnTo)
2  never assign window.location.href directly from a query parameter
3  test both a valid and a hostile returnTo (src/platform/navigation/__tests__/return-to.test.ts)
```

**Security review required** for any change to redirect handling.

## Change CSRF or the API client

**Security review required.**

```text
1  src/platform/api/client.ts
2  credentials: "include" on every request — non-negotiable
3  mutations echo qe_csrf as X-CSRF-Token; GET does not
4  the seeding path (missing cookie -> GET /healthz -> retry) must keep working
5  names MUST match qeet-id-server AND qeet-id-react
6  bun run typecheck && bun run check && bun run test && bun run build
```

## Touch enterprise setup

**Security review required. This is the highest-risk surface in the repository.**

```text
1  src/modules/enterprise-setup/  (api/admin-portal.ts calls the backend's /v1/admin-portal/*)
2  read the one-time token only from `#token=...`, clear the fragment immediately, and exchange it
3  NEVER store it or place it in a path, query string, React state, log, error, or telemetry
4  use only the HttpOnly portal-session cookie and token-free API paths after exchange
5  the SCIM token endpoint returns PLAINTEXT — never render it outside the intended field,
   never persist it, never copy it into an analytics event
6  bun run typecheck && bun run check && bun run test && bun run build
```

## Change the Content-Security-Policy or a security header

**Security review required.**

```text
1  src/platform/security/{content-security-policy,security-headers}.ts — and their unit tests
2  an inline <script> carries nonce={nonce}; never add 'unsafe-inline' to script-src
3  a new off-site resource: name its origin in the one directive that needs it, never a wildcard
4  bun run test:e2e   (every page, in Chromium, must show no violation)
```

## Change MFA entry

```text
1  src/modules/authentication/components/{sign-in/sign-in-form,mfa/mfa-challenge}.tsx
2  the mfa_token stays in React memory — NEVER the URL, NEVER storage
3  POST /v1/auth/session/mfa with the remember flag
4  bun run typecheck && bun run check && bun run test && bun run build
```

## Add a locale

```text
1  src/i18n/locales/<lang>/  — mirror the English namespaces
2  register it in src/i18n/index.ts
3  English is the only locale today; fallback behaviour must keep working
```

## Finish any task

```bash
bun run typecheck && bun run check && bun run test && bun run build
git diff
```

> CI (`ci.yml`) runs typecheck, Biome (`bun run check`), the Vitest suite and the build. Add or
> update a test with every behaviour change, and read your own diff carefully.

### Escalate rather than proceed

Storing a token · weakening CSRF · bypassing `safeReturnTo` · logging an enterprise-setup link token · adding
a server-side secret other than the relay key · calling an endpoint that does not exist · anything requiring another
repository.
