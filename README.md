# Busted Grid

This is not a “data grid component.” This is a decision engine that owns the rules, state machines, and command surface for high‑performance spreadsheets. Rendering layers (DOM, React, canvas, native) simply project the decisions the runtime already made.

## Why this exists (and why it’s different)

Traditional grids (AG Grid, Handsontable, etc.) ship as a monolith: rendering,
keyboard/mouse input, focus/selection state, editing, and column features are
tightly coupled inside the component. You *can* customize them, but you often
customize by negotiating with internal lifecycles and feature flags.

Busted Grid flips that: behavior is a **runtime** you control, and rendering is a
thin adapter. That makes “full customization” a first-class outcome instead of a
special case.

What this enables:

- **Replace keyboard behavior without fighting the renderer.** Keyboard is an
  adapter that emits commands. Swap bindings, add modes (vim keys, wrap
  navigation, custom Tab semantics) without rewriting the table.
- **Own focus/selection/edit as state machines.** The runtime’s state is the
  source of truth. Adapters don’t invent their own state; they just project a
  view model and dispatch commands.
- **Express rules as constraints, not callbacks.** “This column can’t be resized
  past 220px” or “filter is disabled for these columns” is a constraint enforced
  uniformly across mouse/keyboard/programmatic actions.
- **Intercept and compose behavior centrally.** Plugins can validate, cancel, or
  transform commands (`before/after`) so you can add “enterprise” rules without
  threading event handlers through every UI surface.
- **Render anywhere.** DOM/React/Angular are reference adapters. The runtime is
  renderer-agnostic, so a canvas/native adapter doesn’t require a rewrite of the
  behavior layer.

## Mindset shift (how to build with Busted Grid)

If you come from traditional grids, it’s easy to look for “the feature” or “the
prop” that unlocks your goal. In Busted Grid, your first question is different:
**is this goal a command, a constraint, a policy, or a derived view?**

### Common goals → Busted Grid approach

- **“I need custom keyboard navigation.”**
  - Treat input as an adapter problem: map keys → `GridCommand`s.
  - Treat movement semantics as a policy problem: decide how `MOVE_FOCUS`
    resolves (clamp, wrap, skip, jump, etc.).
- **“I need to block/allow behavior based on business rules.”**
  - Put the rule in `GridConstraints` so it applies uniformly to mouse, keyboard,
    and programmatic commands.
- **“I need a special header UI (images, menus, weird layouts).”**
  - Render whatever you want in `<thead>`.
  - Wire interactions by dispatching header commands; gate them with constraints.
- **“I need to intercept something globally.”**
  - Add a plugin to validate/cancel/transform commands in one place instead of
    scattering callbacks across events.

### The trade-off (more setup, less fighting)

Busted Grid deliberately does **less** “out of the box” than monolithic grids.
In seemingly easy scenarios (basic column headers, a default keymap, simple edit
flows), you’ll write more code up front:

- Define your initial state (`focus/selection/edit/columns`).
- Provide constraints/policies instead of toggling feature props.
- Attach an input adapter (keyboard) and decide keybindings.
- Decide how headers/editors look in your UI layer.

That cost is the point: you pay a small amount of explicit setup to get a system
where customization is *structural*, not an escape hatch. When requirements get
weird (enterprise rules, custom input modes, nonstandard headers/editing),
you’re composing commands/constraints/policies instead of wrestling a component’s
internal event model.

## Workspace layout

| Package | Description |
| --- | --- |
| `@busted-grid/runtime` | Core state machines, command dispatcher, constraints, and policy contracts. |
| `@busted-grid/dom` | Lightweight DOM renderer/adapter that turns the runtime view model into table markup. Ships with a default stylesheet. |
| `@busted-grid/react` | React bindings (`useGrid`, `GridView`) built on `useSyncExternalStore` so components stay in sync with the runtime. |
| `@busted-grid/angular` | Standalone Angular component (`<busted-grid-view>`) that wires change detection to the runtime via subscriptions. |
| `@busted-grid/keyboard` | Pluggable keyboard adapter that converts key presses into runtime commands. |

Install everything straight from npm once the packages are published:

```bash
npm install @busted-grid/runtime @busted-grid/dom @busted-grid/react @busted-grid/angular @busted-grid/keyboard
```

## Core ideas (runtime)

1. **Declarative constraints.** Columns are layout + behavior constraints (`width`, `move`, `resize`, `sort`, `edit`, `header`). “Fix the third column at 180px” is a constraint, not a callback.
2. **Owned state machines.** Focus, selection, edit, drag, clipboard, etc. are owned by the runtime. Policies decide how that state evolves.
3. **Command-driven input.** Everything is expressed as commands (`FOCUS_CELL`, `MOVE_FOCUS`, `SELECT_CELL`, `BEGIN_EDIT`, `COMMIT_EDIT`). Input devices translate intent into commands, which keeps behavior inspectable/replayable/testable.
4. **Extension model.** Plugins intercept commands (`before/after`), advertise capabilities, provide editors/formatters, and assert new constraints without callback soup.
5. **Stable data contract.** Grids bind to interfaces (`getRowCount`, `getCell`, `prefetch`, `commitEdit`) instead of raw arrays, which scales without leaking implementation details.
6. **Rendering is an adapter.** The runtime exposes a view model (visible rows, measured sizes, focus/selection rectangles, pinned zones). Renderers simply consume it.

## Headers (runtime-driven)

Headers are part of the runtime contract. The view model exposes `headers` (label,
sort/filter state, width, and capability flags) so adapters can render header UI
without owning behavior. Header interactions should dispatch commands
(`TOGGLE_COLUMN_SORT`, `SET_COLUMN_FILTER`, `SET_COLUMN_WIDTH`), while constraints
(`canSortColumn`, `canFilterColumn`, `canResizeColumn`) gate what is allowed.

Keyboard: the `@busted-grid/keyboard` adapter supports header controls via F6
(focus current column header) and Shift+F6 (focus filter). From the first row,
ArrowUp focuses the current column header and Ctrl+ArrowUp focuses filter. In
header focus, use ArrowLeft/ArrowRight to change columns and Alt+ArrowLeft/Right
to resize.

## Adapter usage

### DOM + keyboard

```ts
import { GridRuntime } from "@busted-grid/runtime"
import { attachDomGrid } from "@busted-grid/dom"
import { attachKeyboard } from "@busted-grid/keyboard"
import "@busted-grid/dom/styles/default.css"

const state = {
  focus: null,
  selection: { anchor: null, rangeEnd: null },
  edit: { status: "idle", cell: null },
  columns: []
}

const runtime = new GridRuntime({ state, constraints, focusPolicy })

const domHandle = attachDomGrid(containerElement, runtime, {
  rows: 100,
  cols: 26
})

const detachKeyboard = attachKeyboard(containerElement, runtime)

// teardown
detachKeyboard()
domHandle.destroy()
```

### React

```tsx
import { GridRuntime } from "@busted-grid/runtime"
import { GridView } from "@busted-grid/react"

const state = {
  focus: null,
  selection: { anchor: null, rangeEnd: null },
  edit: { status: "idle", cell: null },
  columns: []
}

const runtime = new GridRuntime({ state, constraints, focusPolicy })

export function Example() {
  return <GridView runtime={runtime} rows={100} cols={26} />
}
```

The React bindings rely on `useSyncExternalStore`, so multiple components can call `useGrid(runtime)` safely without patching `dispatch`.

### Angular

```ts
import { Component } from "@angular/core"
import { GridRuntime } from "@busted-grid/runtime"
import { GridViewComponent } from "@busted-grid/angular"

const state = {
  focus: null,
  selection: { anchor: null, rangeEnd: null },
  edit: { status: "idle", cell: null },
  columns: []
}

@Component({
  selector: "app-grid",
  standalone: true,
  imports: [GridViewComponent],
  template: `
    <busted-grid-view
      [runtime]="runtime"
      [rows]="100"
      [cols]="26"
      [cellTemplate]="cellTpl"
    ></busted-grid-view>

    <ng-template #cellTpl let-cell>
      {{ cell.row }},{{ cell.col }}
    </ng-template>
  `
})
export class GridExampleComponent {
  runtime = new GridRuntime({ state, constraints, focusPolicy })
}
```

The Angular adapter ships as a standalone component, so you can import it directly into Routed/feature components without touching NgModules. The optional `cellTemplate` input lets you supply your own `ng-template` for custom cell output.

### Virtualization (optional)

DOM:

```ts
attachDomGrid(containerElement, runtime, {
  rows: 10000,
  cols: 1000,
  virtualization: { rowHeight: 24, overscan: 2 }
})
```

React:

```tsx
<GridView
  runtime={runtime}
  rows={10000}
  cols={1000}
  virtualization={{ rowHeight: 24, width: 800, height: 400 }}
/>
```

Angular:

```html
<busted-grid-view
  [runtime]="runtime"
  [rows]="10000"
  [cols]="1000"
  [virtualization]="{ rowHeight: 24, width: 800, height: 400 }"
></busted-grid-view>
```

## Developing in this repo

```bash
npm --version # ensure npm >= 7 (workspace protocol support)
npm install        # installs root + workspace deps
npm run build      # compiles every package (tsc -p packages/*)
```

During local dev you can run a single package build (e.g. `npm run build -w @busted-grid/react`).

### Demos

- DOM demo: `npm run dev -w @busted-grid/dom-demos` (after building runtime/dom/keyboard), then open `http://localhost:5174`
- React demos: `npm run dev -w @busted-grid/react-demos` (after building runtime/react/keyboard), then open `http://localhost:5175`

## Roadmap

- Expand constraint schema (`resize`, `sort`, `edit` policies)
- Add richer `GridConstraints` + `FocusPolicy` implementations
- Provide canvas/native adapters alongside the DOM + React examples

Adapters are intentionally small so you can replace them with your system of choice without rewriting the runtime.
