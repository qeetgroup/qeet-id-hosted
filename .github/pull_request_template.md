<!-- Title: type(scope): summary, for example "fix(sign-in): keep the return address". The title sets the release
version: "feat!: …" is a major, "feat: …" a minor, anything else (fix, docs, chore, ci, refactor) a patch.
A fix found in testing goes into release; everything else into develop. -->

## What and why

<!-- What changes, and the reason. Link the Jira issue. -->

## Checked

- [ ] `bun run typecheck && bun run check && bun run test && bun run build`
- [ ] `bun run test:e2e` when a page changes (its Content-Security-Policy and accessibility)
- [ ] No token stored; every redirect goes through `safeReturnTo`; inline scripts carry the nonce
