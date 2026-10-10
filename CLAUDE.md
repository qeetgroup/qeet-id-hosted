# CLAUDE.md — qeet-id-login

**Read [AGENTS.md](AGENTS.md) first.** It is the model-neutral instruction file and the source of
truth for this repository. This file adds only Claude-specific guidance.

```text
CLAUDE.md  →  AGENTS.md  →  docs/llm/*
```

## Canonical context

| File | For |
|---|---|
| [qeet-repo.yml](qeet-repo.yml) | Machine-readable repository identity |
| [AGENTS.md](AGENTS.md) | **Rules, commands, what CI enforces** |
| [docs/llm/context.md](docs/llm/context.md) | How this repository actually works |
| [docs/llm/boundaries.md](docs/llm/boundaries.md) | What it owns, and what it must not touch |
| [docs/llm/workflows.md](docs/llm/workflows.md) | Step-by-step for common changes |
| [docs/llm/architecture-map.md](docs/llm/architecture-map.md) | "Where is X?" — fastest path to a file |

Parent context: **L0** `qeetgroup/qeet-context` · **L1** `qeetgroup/qeet-id-context`.
Read them when a task needs organization or product understanding; this repository does not restate them.

## The things most likely to trip you up here

1. **Never store a token.** Login and admin-portal sessions are backend HttpOnly cookies — unreadable here, by design.
2. **CSRF is not optional.** `credentials: "include"` everywhere; mutations echo `qe_csrf` as `X-CSRF-Token`. Names must match `qeet-id-server` and `qeet-id-react`.
3. **Never redirect to an unvalidated URL** — always use `safeReturnTo`. An open redirect on the login host is a phishing primitive.
4. **The admin-portal link token is one-time.** Read it only from the URL fragment, clear the fragment immediately, and exchange it once for the backend's HttpOnly portal-session cookie. Never store or log it.
5. **Keep the MFA challenge token in memory** — never the URL, never storage.
6. **Stay stateless.** No server-side secret; only `NEXT_PUBLIC_*`, which is public by construction.

## Working style

- **Read before editing.** Match the neighbouring file's shape rather than introducing an abstraction.
- Use the architecture map instead of guessing a path.
- **Do not read `.env*` or secret files** into anything you write.

## Finishing a change

```bash
bun run typecheck && bun run build
git diff
```

## Escalate rather than proceed

Stop and report if a task would weaken a security control, change a published contract, or require
modifying another repository. Cross-repository impact: `qeet-id-context/CHANGE-MATRIX.md`.
