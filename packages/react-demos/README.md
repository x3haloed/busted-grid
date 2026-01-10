# React Demos

This package is a small routed React app used to demo and stress-test the
`@busted-grid/*` packages.

## Running locally

Build the workspace packages once (to populate `dist/`):

```bash
npm run build -w @busted-grid/runtime -w @busted-grid/react -w @busted-grid/keyboard
```

Start the demo app:

```bash
npm run dev -w @busted-grid/react-demos
```

Open `http://localhost:5175`.

## Demos

### Keyboard + Editing

- Arrow keys move focus.
- Shift+arrows expands selection.
- Enter begins edit on the focused cell (editor overlays the active cell).
- Enter/blur commits (async). Escape cancels.
- Commits reject negatives and non-numeric input.

