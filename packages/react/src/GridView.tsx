import * as React from "react"
import type {
  Cell,
  ColumnHeaderState,
  GridRuntime
} from "@busted-grid/runtime"
import { useGrid } from "./useGrid.js"

export interface GridViewProps {
  runtime: GridRuntime
  rows: number
  cols: number
  idPrefix?: string
  scrollRef?: React.RefObject<HTMLDivElement>
  renderCell?: (cell: Cell) => React.ReactNode
  renderHeaderCell?: (header: ColumnHeaderState) => React.ReactNode
  stickyHeader?: boolean
  virtualization?: {
    rowHeight: number
    width: number
    height: number
    overscan?: number
  }
}

const defaultRenderer = (cell: Cell) => `${cell.row},${cell.col}`

export function GridView({
  runtime,
  rows,
  cols,
  idPrefix: idPrefixProp,
  scrollRef: scrollRefProp,
  renderCell = defaultRenderer,
  renderHeaderCell,
  stickyHeader = false,
  virtualization
}: GridViewProps): JSX.Element {
  const idPrefix = idPrefixProp ?? React.useId()
  const internalScrollRef = React.useRef<HTMLDivElement>(null)
  const scrollRef = scrollRefProp ?? internalScrollRef
  const [scroll, setScroll] = React.useState({ top: 0, left: 0 })
  const viewport = virtualization
    ? {
        rows,
        cols,
        rowHeight: virtualization.rowHeight,
        viewportHeight: virtualization.height,
        scrollTop: scroll.top,
        overscan: virtualization.overscan
      }
    : undefined
  const vm = useGrid(runtime, viewport)
  const overscan = virtualization?.overscan ?? 2
  const rowHeight = virtualization?.rowHeight ?? 1
  const useVirtual = !!virtualization
  const rowStart = useVirtual
    ? Math.max(0, Math.floor(scroll.top / rowHeight) - overscan)
    : 0
  const rowEnd = useVirtual
    ? Math.min(
        rows - 1,
        rowStart +
          Math.ceil(virtualization.height / rowHeight) +
          overscan * 2 -
          1
      )
    : rows - 1
  const topOffset = useVirtual ? rowStart * rowHeight : 0
  const bottomOffset = useVirtual
    ? Math.max(0, rows - rowEnd - 1) * rowHeight
    : 0
  const rowIndexes = Array.from(
    { length: Math.max(0, rowEnd - rowStart + 1) },
    (_, i) => rowStart + i
  )
  const colIndexes = Array.from({ length: cols }, (_, i) => i)
  const activeDescendant = vm.focus
    ? `${idPrefix}-cell-${vm.focus.row}-${vm.focus.col}`
    : undefined

  const colWidths = React.useMemo(() => {
    return Array.from({ length: cols }, (_, index) => {
      const column = vm.columns[index]
      return column?.width ?? 120
    })
  }, [cols, vm.columns])

  const colLeftOffsets = React.useMemo(() => {
    const offsets = new Array<number>(cols)
    let current = 0
    for (let i = 0; i < cols; i++) {
      offsets[i] = current
      current += colWidths[i] ?? 0
    }
    return offsets
  }, [cols, colWidths])

  const headerByCol = React.useMemo(() => {
    const map = new Map<number, ColumnHeaderState>()
    for (const header of vm.headers) {
      map.set(header.col, header)
    }
    return map
  }, [vm.headers])

  const table = (
    <table
      tabIndex={0}
      role="grid"
      aria-rowcount={rows + 1}
      aria-colcount={cols}
      aria-multiselectable={vm.selectionRange ? "true" : "false"}
      aria-activedescendant={activeDescendant}
      className={stickyHeader ? "busted-grid-sticky-header" : undefined}
    >
      <colgroup>
        {colWidths.map((width, index) => (
          <col key={index} style={{ width }} />
        ))}
      </colgroup>
      <thead>
        <tr role="row" aria-rowindex={1}>
          {colIndexes.map(c => {
            const header =
              headerByCol.get(c) ??
              ({
                col: c,
                label: `Column ${c + 1}`,
                width: colWidths[c] ?? 120,
                sort: null,
                filterActive: false,
                canSort: true,
                canFilter: true,
                canResize: true
              } satisfies ColumnHeaderState)

            const sortLabel =
              header.sort === "asc"
                ? "asc"
                : header.sort === "desc"
                  ? "desc"
                  : ""

            return (
              <th
                key={c}
                role="columnheader"
                scope="col"
                aria-colindex={c + 1}
                aria-sort={
                  header.sort === "asc"
                    ? "ascending"
                    : header.sort === "desc"
                      ? "descending"
                      : "none"
                }
                data-filter={header.filterActive || undefined}
                data-sort={header.sort ?? "none"}
                className="grid-header-cell"
              >
                <div className="grid-header-inner">
                  <button
                    type="button"
                    tabIndex={-1}
                    className="grid-header-label"
                    disabled={!header.canSort}
                    onClick={() =>
                      runtime.dispatch({
                        type: "TOGGLE_COLUMN_SORT",
                        col: c
                      })
                    }
                  >
                    {renderHeaderCell
                      ? renderHeaderCell(header)
                      : header.label}
                    {sortLabel ? ` (${sortLabel})` : ""}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="grid-header-filter"
                    disabled={!header.canFilter}
                    aria-pressed={header.filterActive}
                    onClick={() =>
                      runtime.dispatch({
                        type: "SET_COLUMN_FILTER",
                        col: c,
                        active: !header.filterActive
                      })
                    }
                  >
                    Filter
                  </button>
                  <div
                    className="grid-header-resize"
                    role="presentation"
                    onPointerDown={event => {
                      if (!header.canResize) return
                      event.preventDefault()
                      const startX = event.clientX
                      const startWidth = header.width
                      const handleMove = (moveEvent: PointerEvent) => {
                        const nextWidth = Math.max(
                          20,
                          Math.round(
                            startWidth + (moveEvent.clientX - startX)
                          )
                        )
                        runtime.dispatch({
                          type: "SET_COLUMN_WIDTH",
                          col: c,
                          width: nextWidth
                        })
                      }
                      const handleUp = () => {
                        window.removeEventListener("pointermove", handleMove)
                        window.removeEventListener("pointerup", handleUp)
                      }
                      window.addEventListener("pointermove", handleMove)
                      window.addEventListener("pointerup", handleUp)
                    }}
                    data-disabled={!header.canResize || undefined}
                  />
                </div>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {useVirtual && topOffset > 0 && (
          <tr role="presentation" aria-hidden="true">
            <td
              role="presentation"
              aria-hidden="true"
              colSpan={cols}
              style={{ height: topOffset, border: "none", padding: 0 }}
            />
          </tr>
        )}
        {rowIndexes.map(r => (
          <tr
            key={r}
            role="row"
            aria-rowindex={r + 2}
            style={
              useVirtual ? { height: virtualization?.rowHeight } : undefined
            }
          >
            {colIndexes.map(c => {
              const cell = { row: r, col: c }
              const focused = vm.focus?.row === r && vm.focus?.col === c
              const range = vm.selectionRange
              const selected =
                !!range &&
                r >= range.start.row &&
                r <= range.end.row &&
                c >= range.start.col &&
                c <= range.end.col
              const edit = vm.edit
              const editing =
                edit.status === "editing" &&
                !!edit.cell &&
                edit.cell.row === r &&
                edit.cell.col === c

              return (
                <td
                  key={c}
                  data-focused={focused || undefined}
                  data-selected={selected || undefined}
                  data-editing={editing || undefined}
                  role="gridcell"
                  aria-colindex={c + 1}
                  aria-selected={selected}
                  id={`${idPrefix}-cell-${r}-${c}`}
                  onClick={event => {
                    if (event.shiftKey) {
                      const anchor = vm.selection.anchor ?? vm.focus
                      if (!anchor) {
                        runtime.dispatch({ type: "SET_ANCHOR", cell })
                      }
                      runtime.dispatch({ type: "EXTEND_SELECTION", cell })
                      return
                    }
                    runtime.dispatch({ type: "SELECT_CELL", cell })
                  }}
                >
                  {renderCell(cell)}
                </td>
              )
            })}
          </tr>
        ))}
        {useVirtual && bottomOffset > 0 && (
          <tr role="presentation" aria-hidden="true">
            <td
              role="presentation"
              aria-hidden="true"
              colSpan={cols}
              style={{ height: bottomOffset, border: "none", padding: 0 }}
            />
          </tr>
        )}
      </tbody>
    </table>
  )

  React.useLayoutEffect(() => {
    if (!virtualization) return
    const focus = vm.focus
    const container = scrollRef.current
    if (!focus || !container) return
    const viewHeight = virtualization.height
    const viewWidth = virtualization.width
    const cellTop = focus.row * virtualization.rowHeight
    const cellBottom = cellTop + virtualization.rowHeight
    const cellLeft = colLeftOffsets[focus.col] ?? 0
    const cellRight = cellLeft + (colWidths[focus.col] ?? 0)
    let nextTop = container.scrollTop
    let nextLeft = container.scrollLeft

    if (cellTop < nextTop) {
      nextTop = cellTop
    } else if (cellBottom > nextTop + viewHeight) {
      nextTop = cellBottom - viewHeight
    }

    if (cellLeft < nextLeft) {
      nextLeft = cellLeft
    } else if (cellRight > nextLeft + viewWidth) {
      nextLeft = cellRight - viewWidth
    }

    if (nextTop !== scroll.top || nextLeft !== scroll.left) {
      setScroll({ top: nextTop, left: nextLeft })
    }
  }, [
    colLeftOffsets,
    colWidths,
    virtualization,
    vm.focus,
    scroll.top,
    scroll.left
  ])

  if (!virtualization) {
    return table
  }

  return (
    <div
      ref={scrollRef}
      style={{
        width: virtualization.width,
        height: virtualization.height,
        overflow: "auto"
      }}
      onScroll={event => {
        const target = event.currentTarget
        setScroll({
          top: target.scrollTop,
          left: target.scrollLeft
        })
      }}
    >
      {table}
    </div>
  )
}
