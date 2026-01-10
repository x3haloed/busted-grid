import * as React from "react"
import type {
  Cell,
  CommandContext,
  DispatchResult,
  GridCommand,
  GridCommandPlugin,
  GridState
} from "@busted-grid/runtime"
import { GridRuntime, defaultEditPolicy } from "@busted-grid/runtime"
import { GridView, useGrid } from "@busted-grid/react"
import { attachKeyboard } from "@busted-grid/keyboard"

const rows = 2000
const cols = 30

type StatusTone = "info" | "error" | "success"
type Status = { message: string; tone: StatusTone }

type CommandLogEntry = {
  id: number
  command: GridCommand
  result: { status: string; reason?: string }
}

export function KeyboardEditingDemo(): JSX.Element {
  const dataRef = React.useRef(new Map<string, number>())
  const logIdRef = React.useRef(0)
  const [status, setStatus] = React.useState<Status>({
    message: "Ready.",
    tone: "info"
  })
  const [commandLog, setCommandLog] = React.useState<CommandLogEntry[]>([])

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
      canSortColumn(col: number) {
        return col % 3 !== 0
      },
      canFilterColumn(col: number) {
        return col % 4 !== 0
      },
      canResizeColumn(_col: number, width: number) {
        return width >= 80 && width <= 180
      }
    }

    const focusPolicy = {
      move(from: Cell, dx: number, dy: number) {
        return { row: from.row + dy, col: from.col + dx }
      }
    }

    const commitDelayMs = 250
    const editPolicy = {
      ...defaultEditPolicy,
      commitEdit: async (cell: Cell, value: unknown) => {
        await delay(commitDelayMs)
        const next = toNumber(value)
        if (next == null) {
          throw new Error("Value must be a number.")
        }
        if (next < 0) {
          throw new Error("Negative values are not allowed.")
        }
        dataRef.current.set(cellKey(cell), next)
      },
      onCommitSuccess: (_cell: Cell, value: unknown) => {
        const parsed = toNumber(value)
        setStatus({
          message:
            parsed == null ? "Saved." : `Saved ${parsed.toLocaleString()}.`,
          tone: "success"
        })
      },
      onCommitError: (_cell: Cell, _value: unknown, error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Commit failed."
        setStatus({ message, tone: "error" })
      }
    }

    const plugin: GridCommandPlugin = {
      name: "demo-command-log",
      afterCommand: (
        command: GridCommand,
        _context: CommandContext,
        result: DispatchResult
      ) => {
        const dispatchResult = result
        setCommandLog(previous => {
          const entry: CommandLogEntry = {
            id: ++logIdRef.current,
            command,
            result: dispatchResult
          }
          const next = [entry, ...previous]
          return next.slice(0, 8)
        })
      }
    }

    return new GridRuntime({
      state,
      constraints,
      focusPolicy,
      editPolicy,
      plugins: [plugin]
    })
  }, [])

  return (
    <KeyboardEditingView
      runtime={runtime}
      data={dataRef.current}
      status={status}
      commandLog={commandLog}
      onStatusChange={setStatus}
    />
  )
}

function KeyboardEditingView({
  runtime,
  data,
  status,
  commandLog,
  onStatusChange
}: {
  runtime: GridRuntime
  data: Map<string, number>
  status: Status
  commandLog: CommandLogEntry[]
  onStatusChange: (status: Status) => void
}): JSX.Element {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const gridScrollRef = React.useRef<HTMLDivElement>(null)
  const vm = useGrid(runtime)

  React.useEffect(() => {
    if (!wrapperRef.current) return
    return attachKeyboard(wrapperRef.current, runtime)
  }, [runtime])

  const virtualization = React.useMemo(() => ({
    rowHeight: 30,
    width: 980,
    height: 520,
    overscan: 2
  }), [])

  const getCellValue = React.useCallback((cell: Cell) => getValue(data, cell), [data])

  const { editor, startEditing, cancelEditing, commitEditing } =
    useOverlayEditor({
      runtime,
      gridWrapperRef: wrapperRef,
      gridScrollRef,
      getCellValue
    })

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Keyboard + Editing</h1>
        <p className="page-subtitle">
          Click inside the grid. Arrow keys move focus. Enter edits. Escape
          cancels. Shift+arrows expands selection.
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
                  data.clear()
                  onStatusChange({ message: "Cleared data.", tone: "info" })
                  runtime.dispatch({
                    type: "SELECT_CELL",
                    cell: { row: 0, col: 0 }
                  })
                }}
              >
                Reset
              </button>
              <button
                className="button"
                type="button"
                onClick={() => onStatusChange({ message: "Ready.", tone: "info" })}
              >
                Clear status
              </button>
            </div>
          </div>

          <div
            ref={wrapperRef}
            className="grid-stage"
            tabIndex={0}
            onMouseDown={() => {
              // Let the click dispatch selection/focus first, then focus wrapper.
              queueMicrotask(() => wrapperRef.current?.focus())
            }}
          >
            <GridView
              runtime={runtime}
              rows={rows}
              cols={cols}
              idPrefix="react-demo"
              scrollRef={gridScrollRef}
              stickyHeader
              virtualization={virtualization}
              renderCell={cell => {
                const value = getCellValue(cell)
                return value.toLocaleString()
              }}
            />
            {editor}
          </div>

          <div className="demo-stage-footer">
            <div className="pill">
              <span className="pill-label">Focus</span>
              <span className="pill-value">
                {vm.focus ? `${vm.focus.row}, ${vm.focus.col}` : "none"}
              </span>
            </div>
            <div className="pill">
              <span className="pill-label">Selection</span>
              <span className="pill-value">
                {vm.selectionRange
                  ? `${vm.selectionRange.start.row},${vm.selectionRange.start.col} → ${vm.selectionRange.end.row},${vm.selectionRange.end.col}`
                  : "none"}
              </span>
            </div>
            <div className={`pill pill-${status.tone}`}>
              <span className="pill-label">Status</span>
              <span className="pill-value">{status.message}</span>
            </div>
          </div>
        </section>

        <aside className="demo-panel">
          <section className="card">
            <h2 className="card-title">Editing</h2>
            <ul className="list">
              <li>Enter opens an overlay editor for the focused cell.</li>
              <li>Enter commits (async). Escape cancels.</li>
              <li>Non-numeric or negative values fail on commit.</li>
            </ul>
            <div className="card-actions">
              <button
                className="button button-primary"
                type="button"
                onClick={() => startEditing()}
                disabled={!vm.focus || vm.edit.status !== "idle"}
              >
                Edit focused cell
              </button>
              <button
                className="button"
                type="button"
                onClick={() => commitEditing()}
                disabled={vm.edit.status !== "editing"}
              >
                Commit
              </button>
              <button
                className="button"
                type="button"
                onClick={() => cancelEditing()}
                disabled={vm.edit.status === "idle"}
              >
                Cancel
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

function useOverlayEditor({
  runtime,
  gridWrapperRef,
  gridScrollRef,
  getCellValue
}: {
  runtime: GridRuntime
  gridWrapperRef: React.RefObject<HTMLDivElement>
  gridScrollRef: React.RefObject<HTMLDivElement>
  getCellValue: (cell: Cell) => number
}): {
  editor: JSX.Element | null
  startEditing: () => void
  cancelEditing: () => void
  commitEditing: () => void
} {
  const vm = useGrid(runtime)
  const [draft, setDraft] = React.useState("")
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const updateRect = React.useCallback(() => {
    const cell = runtime.getViewModel().edit.cell ?? runtime.getViewModel().focus
    if (!cell) {
      setRect(null)
      return
    }
    const td = document.getElementById(
      `react-demo-cell-${cell.row}-${cell.col}`
    )
    if (!td) {
      setRect(null)
      return
    }
    setRect(td.getBoundingClientRect())
  }, [runtime])

  const startEditing = React.useCallback(() => {
    const focus = runtime.getViewModel().focus
    if (!focus) return
    runtime.dispatch({ type: "BEGIN_EDIT", cell: focus })
  }, [runtime])

  const cancelEditing = React.useCallback(() => {
    runtime.dispatch({ type: "CANCEL_EDIT" })
  }, [runtime])

  const commitEditing = React.useCallback(() => {
    runtime.dispatch({ type: "COMMIT_EDIT", value: draft })
  }, [runtime, draft])

  React.useLayoutEffect(() => {
    if (vm.edit.status !== "editing" || !vm.edit.cell) return
    const value = getCellValue(vm.edit.cell)
    setDraft(String(value))
    updateRect()
    queueMicrotask(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [getCellValue, updateRect, vm.edit.cell, vm.edit.status])

  React.useEffect(() => {
    if (vm.edit.status !== "editing") return
    const scrollElement = gridScrollRef.current
    if (!scrollElement) return

    const onScroll = () => updateRect()
    const onResize = () => updateRect()
    scrollElement.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)
    return () => {
      scrollElement.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
    }
  }, [gridScrollRef, updateRect, vm.edit.status])

  const editor =
    vm.edit.status === "editing" && vm.edit.cell && rect ? (
      <div
        className="grid-editor-portal"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }}
      >
        <input
          ref={inputRef}
          className="grid-editor"
          value={draft}
          inputMode="numeric"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault()
              event.stopPropagation()
              commitEditing()
              gridWrapperRef.current?.focus()
            } else if (event.key === "Escape") {
              event.preventDefault()
              event.stopPropagation()
              cancelEditing()
              gridWrapperRef.current?.focus()
            }
          }}
          onBlur={() => {
            commitEditing()
            gridWrapperRef.current?.focus()
          }}
        />
      </div>
    ) : null

  return { editor, startEditing, cancelEditing, commitEditing }
}

function cellKey(cell: Cell): string {
  return `${cell.row}:${cell.col}`
}

function getValue(data: Map<string, number>, cell: Cell): number {
  const key = cellKey(cell)
  const existing = data.get(key)
  if (existing != null) return existing
  const seeded = cell.row * cols + cell.col
  data.set(key, seeded)
  return seeded
}

function toNumber(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN
  return Number.isFinite(numeric) ? numeric : null
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
