# Contributing to Busted Grid

## Quick start

```bash
npm --version # ensure npm >= 7 (workspace protocol support)
npm install
npm run build
```

The workspace build compiles each package with its local `tsconfig` under `packages/*`.

## What to work on

- Check `ROADMAP.md` for planned features.
- Small, focused PRs are easiest to review.
- Prefer runtime changes that keep adapters thin and declarative.

## Development notes

- Keep behavior in the runtime and expose it via commands, constraints, or policies.
- Adapters should translate view models into UI with minimal state of their own.
- If you add a new command or constraint, document the intent in the package README or a short inline comment where it is introduced.

## Submitting changes

1. Create a branch for your work.
2. Keep commits scoped and descriptive.
3. Run `npm run build` before opening a PR.
4. Open a PR describing the motivation, behavior change, and any follow-ups.
