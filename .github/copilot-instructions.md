# GitHub Copilot — qeet-id-login

**Canonical instructions: [`AGENTS.md`](../AGENTS.md).** This file is a summary; it adds no
architecture.

## Repository

The **hosted authentication UI for Qeet ID** (`login.id.qeet.in`). Next.js 16 App Router, React 19, `@qeetrix/ui`, bun. **The only host where an interactive Qeet ID session is established** — every other product redirects here over OIDC. Stateless: no database, no secrets.

Context: **L0** `qeet-context` (organization) → **L1** `qeet-id-context` (product) → **L2** this
repository → source.

## Structure

`src/app/` route segments (`login` `signup` `forgot-password` `reset` `consent` `device` `logged-out` `admin-portal`), `src/components/`, `src/lib/{api,admin-portal,branding}.ts`, `src/i18n/` (English only). Every action is an API call to `qeet-id-server`.

## Rules

1. **Never store a token.** Login and admin-portal sessions are backend HttpOnly cookies — unreadable here, by design.
2. **CSRF is not optional.** `credentials: "include"` everywhere; mutations echo `qe_csrf` as `X-CSRF-Token`. Names must match `qeet-id-server` and `qeet-id-react`.
3. **Never redirect to an unvalidated URL** — always use `safeReturnTo`. An open redirect on the login host is a phishing primitive.
4. **The admin-portal link token is one-time.** Read it only from the URL fragment, clear the fragment immediately, exchange it once for the backend's HttpOnly portal-session cookie, and never store or log it.
5. **Keep the MFA challenge token in memory** — never the URL, never storage.
6. **Stay stateless.** No server-side secret; only `NEXT_PUBLIC_*`, which is public by construction.

## Commands

`bun run dev -- -p 3003` · `bun run build` · `bun run typecheck`

## Do not

- store a token in localStorage, sessionStorage, a cookie, or React state
- add a skip-CSRF flag or drop `credentials: "include"`
- assign `window.location.href` from a query parameter without `safeReturnTo`
- log, query-string, or telemetry an admin-portal token
- introduce a server-side secret — this app is stateless by design
- call an endpoint you have not verified in `qeet-id-server`
