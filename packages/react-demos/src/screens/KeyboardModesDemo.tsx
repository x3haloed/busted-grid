import * as React from "react"
import type {
  Cell,
  CommandContext,
  DispatchResult,
  GridCommand,
  GridCommandPlugin,
  GridState
} from "@busted-grid/runtime"
import { GridRuntime } from "@busted-grid/runtime"
import { GridView, useGrid } from "@busted-grid/react"

const rows = 2000
const cols = 30

type StatusTone = "info" | "success" | "error"
type Status = { message: string; tone: StatusTone }

type CommandLogEntry = {
  id: number
  command: GridCommand
  result: { status: string; reason?: string }
}

type FocusMode = "blocked-edges" | "clamp" | "wrap"

type Keymap = "arrows" | "vim"

type TabMode = "columns" | "rows"

export function KeyboardModesDemo(): JSX.Element {
  const logIdRef = React.useRef(0)
  const [status, setStatus] = React.useState<Status>({
    message: "Ready.",
    tone: "info"
  })
  const [commandLog, setCommandLog] = React.useState<CommandLogEntry[]>([])
  const [focusMode, setFocusMode] = React.useState<FocusMode>("blocked-edges")
  const [keymap, setKeymap] = React.useState<Keymap>("arrows")
  const [tabMode, setTabMode] = React.useState<TabMode>("columns")

  const runtime = React.useMemo(() => {
    const state: GridState = {
      focus: { row: 0, col: 0 },
      selection: { anchor: null, rangeEnd: null },
      edit: { status: "idle", cell: null },
      columns: Array.from({ length: cols }, (_, index) => ({
        width: 120,
        label: columnLabel(index)
      }))
    }

    const constraints = {
      canFocus(cell: Cell) {
        return (
          cell.row >= 0 &&
          cell.row < rows &&
          cell.col >= 0 &&
          cell.col < cols
        )
      },
      canMoveFocus(_from: Cell, to: Cell) {
        return (
          to.row >= 0 &&
          to.row < rows &&
          to.col >= 0 &&
          to.col < cols
        )
      },
      canResizeColumn(_col: number, width: number) {
        return width >= 70 && width <= 220
      }
    }

    const plugin: GridCommandPlugin = {
      name: "demo-command-log",
      afterCommand: (
        command: GridCommand,
        _context: CommandContext,
        result: DispatchResult
      ) => {
        setCommandLog(previous => {
          const entry: CommandLogEntry = {
            id: ++logIdRef.current,
            command,
            result
          }
          const next = [entry, ...previous]
          return next.slice(0, 10)
        })
      }
    }

    return new GridRuntime({
      state,
      constraints,
      focusPolicy: createBlockedEdgesPolicy(),
      plugins: [plugin]
    })
  }, [])

  const vm = useGrid(runtime)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const gridScrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    runtime.replaceFocusPolicy(createFocusPolicy(focusMode))
    setStatus({
      message: `Focus mode: ${focusModeLabel(focusMode)}.`,
      tone: "info"
    })
  }, [focusMode, runtime])

  React.useEffect(() => {
    if (!wrapperRef.current) return
    return attachDemoKeyboard(wrapperRef.current, runtime, {
      keymap,
      tabMode,
      onStatus: setStatus
    })
  }, [keymap, runtime, tabMode])

  const virtualization = React.useMemo(
    () => ({
      rowHeight: 30,
      width: 980,
      height: 520,
      overscan: 2
    }),
    []
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Keyboard Modes</h1>
        <p className="page-subtitle">
          This demo swaps focus policies and keymaps without changing the grid
          renderer. F6 focuses the current column header (Shift+F6 focuses
          filter). From the first row, ArrowUp focuses the header and
          Ctrl+ArrowUp focuses filter.
        </p>
      </div>

      <div className="demo-layout">
        <section className="demo-stage card">
          <div className="demo-stage-header">
            <div className="demo-stage-title">Grid</div>
            <div className="demo-stage-actions">
              <button
                className="button"
                type="button"
                onClick={() => {
                  runtime.dispatch({
                    type: "SELECT_CELL",
                    cell: { row: 0, col: 0 }
                  })
                  setStatus({ message: "Reset focus.", tone: "info" })
                }}
              >
                Reset focus
              </button>
              <button
                className="button"
                type="button"
                onClick={() => setCommandLog([])}
              >
                Clear log
              </button>
            </div>
          </div>

          <div
            ref={wrapperRef}
            className="grid-stage"
            tabIndex={0}
            onMouseDown={() => {
              queueMicrotask(() => wrapperRef.current?.focus())
            }}
          >
            <GridView
              runtime={runtime}
              rows={rows}
              cols={cols}
              idPrefix="keyboard-modes"
              scrollRef={gridScrollRef}
              stickyHeader
              virtualization={virtualization}
              renderCell={cell => `${cell.row * cols + cell.col}`}
            />
          </div>

          <div className="demo-stage-footer">
            <div className="pill">
              <span className="pill-label">Focus</span>
              <span className="pill-value">
                {vm.focus ? `${vm.focus.row}, ${vm.focus.col}` : "none"}
              </span>
            </div>
            <div className="pill">
              <span className="pill-label">Mode</span>
              <span className="pill-value">{focusModeLabel(focusMode)}</span>
            </div>
            <div className={`pill pill-${status.tone}`}>
              <span className="pill-label">Status</span>
              <span className="pill-value">{status.message}</span>
            </div>
          </div>
        </section>

        <aside className="demo-panel">
          <section className="card">
            <h2 className="card-title">Controls</h2>
            <ul className="list">
              <li>
                Focus policy controls how MOVE_FOCUS resolves at the edges.
              </li>
              <li>
                Keymap controls which physical keys dispatch movement commands.
              </li>
              <li>
                Tab mode demonstrates writing a custom adapter (Tab can move
                across columns or down rows).
              </li>
            </ul>
            <div className="card-actions">
              <button
                className={`button${focusMode === "blocked-edges" ? " button-primary" : ""}`}
                type="button"
                onClick={() => setFocusMode("blocked-edges")}
              >
                Blocked edges
              </button>
              <button
                className={`button${focusMode === "clamp" ? " button-primary" : ""}`}
                type="button"
                onClick={() => setFocusMode("clamp")}
              >
                Clamp
              </button>
              <button
                className={`button${focusMode === "wrap" ? " button-primary" : ""}`}
                type="button"
                onClick={() => setFocusMode("wrap")}
              >
                Wrap
              </button>
            </div>
            <div className="card-actions">
              <button
                className={`button${keymap === "arrows" ? " button-primary" : ""}`}
                type="button"
                onClick={() => setKeymap("arrows")}
              >
                Arrow keys
              </button>
              <button
                className={`button${keymap === "vim" ? " button-primary" : ""}`}
                type="button"
                onClick={() => setKeymap("vim")}
              >
                Vim keys (h/j/k/l)
              </button>
            </div>
            <div className="card-actions">
              <button
                className={`button${tabMode === "columns" ? " button-primary" : ""}`}
                type="button"
                onClick={() => setTabMode("columns")}
              >
                Tab: columns
              </button>
              <button
                className={`button${tabMode === "rows" ? " button-primary" : ""}`}
                type="button"
                onClick={() => setTabMode("rows")}
              >
                Tab: rows
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Command log</h2>
            <ol className="command-log">
              {commandLog.length === 0 ? (
                <li className="command-log-empty">No commands yet.</li>
              ) : (
                commandLog.map(entry => (
                  <li key={entry.id} className="command-log-item">
                    <span className="command-log-type">{entry.command.type}</span>
                    <span className="command-log-result">
                      {entry.result.status}
                      {entry.result.reason ? ` (${entry.result.reason})` : ""}
                    </span>
                  </li>
                ))
              )}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}

function focusModeLabel(mode: FocusMode): string {
  switch (mode) {
    case "blocked-edges":
      return "blocked edges"
    case "clamp":
      return "clamp"
    case "wrap":
      return "wrap"
  }
}

function createFocusPolicy(mode: FocusMode) {
  switch (mode) {
    case "blocked-edges":
      return createBlockedEdgesPolicy()
    case "clamp":
      return createClampPolicy()
    case "wrap":
      return createWrapPolicy()
  }
}

function createBlockedEdgesPolicy() {
  return {
    move(from: Cell, dx: number, dy: number) {
      return { row: from.row + dy, col: from.col + dx }
    }
  }
}

function createClampPolicy() {
  return {
    move(from: Cell, dx: number, dy: number) {
      const nextRow = clamp(from.row + dy, 0, rows - 1)
      const nextCol = clamp(from.col + dx, 0, cols - 1)
      return { row: nextRow, col: nextCol }
    }
  }
}

function createWrapPolicy() {
  return {
    move(from: Cell, dx: number, dy: number) {
      const nextRow = wrap(from.row + dy, rows)
      const nextCol = wrap(from.col + dx, cols)
      return { row: nextRow, col: nextCol }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

function wrap(value: number, size: number): number {
  if (size <= 0) return 0
  const next = value % size
  return next < 0 ? next + size : next
}

function columnLabel(index: number): string {
  let label = ""
  let value = index
  while (value >= 0) {
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  }
  return label
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}

function getHeaderControl(
  root: HTMLElement,
  col: number,
  control: "sort" | "filter"
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[data-busted-grid-header-control="${control}"][data-busted-grid-col="${col}"]`
  )
}

function attachDemoKeyboard(
  element: HTMLElement,
  runtime: GridRuntime,
  options: {
    keymap: Keymap
    tabMode: TabMode
    onStatus: (status: Status) => void
  }
): () => void {
  const { keymap, tabMode, onStatus } = options

  const keyBindings: Record<string, { dx: number; dy: number }> = {
    ArrowUp: { dx: 0, dy: -1 },
    ArrowDown: { dx: 0, dy: 1 },
    ArrowLeft: { dx: -1, dy: 0 },
    ArrowRight: { dx: 1, dy: 0 },
    PageUp: { dx: 0, dy: -10 },
    PageDown: { dx: 0, dy: 10 }
  }

  if (keymap === "vim") {
    keyBindings.h = { dx: -1, dy: 0 }
    keyBindings.j = { dx: 0, dy: 1 }
    keyBindings.k = { dx: 0, dy: -1 }
    keyBindings.l = { dx: 1, dy: 0 }
  }

  const listener = (event: KeyboardEvent) => {
    const headerControl =
      event.target instanceof HTMLElement
        ? event.target.getAttribute("data-busted-grid-header-control")
        : null
    const headerColText =
      event.target instanceof HTMLElement
        ? event.target.getAttribute("data-busted-grid-col")
        : null
    const headerCol = headerColText ? Number(headerColText) : null

    if (
      headerControl &&
      (headerControl === "sort" || headerControl === "filter") &&
      headerCol != null &&
      Number.isFinite(headerCol)
    ) {
      if (event.key === "Escape" || event.key === "F6" || event.key === "ArrowDown") {
        element.querySelector<HTMLElement>('table[role="grid"]')?.focus()
        event.preventDefault()
        return
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const direction = event.key === "ArrowLeft" ? -1 : 1
        if (event.altKey) {
          const vm = runtime.getViewModel()
          const header = vm.headers[headerCol]
          if (header) {
            const delta = event.shiftKey ? 25 : 10
            runtime.dispatch({
              type: "SET_COLUMN_WIDTH",
              col: headerCol,
              width: header.width + direction * delta
            })
          }
        } else {
          const next = getHeaderControl(
            element,
            headerCol + direction,
            headerControl
          )
          next?.focus()
        }
        event.preventDefault()
        return
      }

      return
    }

    if (isEditableElement(event.target)) return

    if (event.key === "F6") {
      const vm = runtime.getViewModel()
      const col = vm.focus?.col ?? 0
      const control = event.shiftKey ? "filter" : "sort"
      const header = getHeaderControl(element, col, control)
      if (header) {
        header.focus()
        onStatus({
          message: control === "filter" ? "Header filter focus." : "Header focus.",
          tone: "info"
        })
        event.preventDefault()
      }
      return
    }

    if (event.key === "ArrowUp" && !event.shiftKey) {
      const vm = runtime.getViewModel()
      if (vm.focus && vm.focus.row === 0) {
        const control = event.ctrlKey ? "filter" : "sort"
        const header = getHeaderControl(element, vm.focus.col, control)
        if (header) {
          header.focus()
          event.preventDefault()
          return
        }
      }
    }

    if (event.key === "Tab") {
      const direction = event.shiftKey ? -1 : 1
      runtime.dispatch(
        tabMode === "rows"
          ? { type: "MOVE_FOCUS", dx: 0, dy: direction }
          : { type: "MOVE_FOCUS", dx: direction, dy: 0 }
      )
      event.preventDefault()
      return
    }

    const binding = keyBindings[event.key]
    if (!binding) return

    if (event.shiftKey) {
      const vm = runtime.getViewModel()
      const focus = vm.focus
      if (!focus) {
        event.preventDefault()
        return
      }
      if (!vm.selection.anchor) {
        runtime.dispatch({ type: "SET_ANCHOR", cell: focus })
      }
      const moveResult = runtime.dispatch({
        type: "MOVE_FOCUS",
        dx: binding.dx,
        dy: binding.dy
      })
      if (moveResult.status === "applied") {
        const nextFocus = runtime.getViewModel().focus
        if (nextFocus) {
          runtime.dispatch({
            type: "EXTEND_SELECTION",
            cell: nextFocus
          })
        }
      }
    } else {
      runtime.dispatch({
        type: "MOVE_FOCUS",
        dx: binding.dx,
        dy: binding.dy
      })
    }

    event.preventDefault()
  }

  element.addEventListener("keydown", listener)
  return () => element.removeEventListener("keydown", listener)
}

