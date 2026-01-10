# DOM Demos

This package hosts DOM-only demos for Busted Grid. It avoids bundlers and uses
native ES modules.

## Running the hostile demo

Build the workspace packages once (to populate `dist/`):

```bash
npm run build -w @busted-grid/runtime -w @busted-grid/dom -w @busted-grid/keyboard
```

Start the demo server:

```bash
npm run dev -w @busted-grid/dom-demos
```

Open `http://localhost:5174`.

### Demo rules

- Enter begins edit on the focused cell and prompts for a new value.
- Negative values are rejected on commit.
- Non-numeric input is rejected.
- Header controls dispatch sort, filter, and resize commands.
- Selection guard cancels range expansion via a command hook.

### Architecture notes

- Policy: default focus policy with async edit policy override.
- Command interception: `EXTEND_SELECTION` is cancelled when selection guard is on.
- Adapter: DOM renderer stays thin; header controls live in the demo.
