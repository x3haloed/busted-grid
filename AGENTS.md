# Repository Guidelines

## Project Structure & Module Organization

- Make sure to read `README.md` and `CONTRIBUTING.md`

## Coding Style & Naming Conventions

- Language: TypeScript (ESM, `moduleResolution: NodeNext`, `strict: true`).
- Indentation: 2 spaces (match existing files in `packages/*/src`).
- File naming: `PascalCase` for components (`GridView.tsx`), `camelCase` for hooks/utilities (`useGrid.ts`), `kebab-case` for CSS.

No formatter/linter is configured; keep style consistent with nearby code.

## Commit & Pull Request Guidelines

- Commit messages in history are short, imperative, and lower-case (e.g., “add contributing guide”); keep the same tone.
- Keep commits scoped and descriptive; prefer small, focused PRs.
- Run `npm run build` before opening a PR.
- PRs should explain motivation, behavior changes, and follow-ups.

## Development Notes

- Keep behavior in the runtime; adapters should remain thin and declarative.
- New commands/constraints should include a short inline note or README update in the relevant package.
