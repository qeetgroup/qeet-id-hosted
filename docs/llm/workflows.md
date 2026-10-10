# Workflows — qeet-id-login

**Level:** L2 · **Last verified:** 2026-08-28
**Verification scope:** every command checked against `package.json`; endpoints against `src/lib/`.

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
3  route                      src/app/<flow>/page.tsx  +  <flow>-form.tsx
4  API call                   src/lib/api.ts — the single client; mutations get CSRF automatically
5  i18n                       src/i18n/locales/en/<namespace>.json  (English only today)
6  branding                   already applied by the server component — do not hardcode
7  errors                     switch on error.code; never render a backend message
8  bun run typecheck && bun run build
```

**Never invent an endpoint.** If the flow needs one that does not exist, the work is in
`qeet-id-server`.

## Add a page

```text
1  src/app/<route>/page.tsx   (server component — fetch branding here)
2  a client form component if it needs interactivity
3  compose from src/components/{auth-card,auth-shell,form-alert}
4  register any new i18n namespace in src/i18n/
5  bun run typecheck && bun run build
```

## Handle a redirect

```text
1  ALWAYS pass the candidate through safeReturnTo(returnTo)
2  never assign window.location.href directly from a query parameter
3  test both a valid and a hostile returnTo
```

**Security review required** for any change to redirect handling.

## Change CSRF or the API client

**Security review required.**

```text
1  src/lib/api.ts
2  credentials: "include" on every request — non-negotiable
3  mutations echo qe_csrf as X-CSRF-Token; GET does not
4  the seeding path (missing cookie -> GET /healthz -> retry) must keep working
5  names MUST match qeet-id-server AND qeet-id-react
6  bun run typecheck && bun run build
```

## Touch the admin portal

**Security review required. This is the highest-risk surface in the repository.**

```text
1  src/lib/admin-portal.ts  +  src/app/admin-portal/
2  read the one-time token only from `#token=...`, clear the fragment immediately, and exchange it
3  NEVER store it or place it in a path, query string, React state, log, error, or telemetry
4  use only the HttpOnly portal-session cookie and token-free API paths after exchange
5  the SCIM token endpoint returns PLAINTEXT — never render it outside the intended field,
   never persist it, never copy it into an analytics event
6  bun run typecheck && bun run build
```

## Change MFA entry

```text
1  src/app/login/login-form.tsx
2  the mfa_token stays in React memory — NEVER the URL, NEVER storage
3  POST /v1/auth/session/mfa with the remember flag
4  bun run typecheck && bun run build
```

## Add a locale

```text
1  src/i18n/locales/<lang>/  — mirror the English namespaces
2  register it in src/i18n/index.ts
3  English is the only locale today; fallback behaviour must keep working
```

## Finish any task

```bash
bun run typecheck && bun run build
git diff
```

> **There is no CI, no test suite and no lint script in this repository.** The Vercel build is the
> only automated gate. `typecheck` + `build` locally is genuinely all the safety net there is —
> run both, and read your own diff carefully.

### Escalate rather than proceed

Storing a token · weakening CSRF · bypassing `safeReturnTo` · logging an admin-portal token · adding
a server-side secret · calling an endpoint that does not exist · anything requiring another
repository.
