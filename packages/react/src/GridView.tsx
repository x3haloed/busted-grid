import * as React from "react"
import type { Cell, GridRuntime } from "@busted-grid/runtime"
import { useGrid } from "./useGrid.js"

export interface GridViewProps {
  runtime: GridRuntime
  rows: number
  cols: number
  idPrefix?: string
  scrollRef?: React.RefObject<HTMLDivElement>
  renderCell?: (cell: Cell) => React.ReactNode
  virtualization?: {
    rowHeight: number
    colWidth: number
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
      colWidth: virtualization.colWidth,
      viewportHeight: virtualization.height,
      viewportWidth: virtualization.width,
      scrollTop: scroll.top,
      scrollLeft: scroll.left,
      overscan: virtualization.overscan
    }
    : undefined
  const vm = useGrid(runtime, viewport)
  const rowRange = vm.viewport?.rowRange ?? { start: 0, end: rows - 1 }
  const colRange = vm.viewport?.colRange ?? { start: 0, end: cols - 1 }
  const rowStart = Math.max(0, rowRange.start)
  const rowEnd = Math.min(rows - 1, rowRange.end)
  const colStart = Math.max(0, colRange.start)
  const colEnd = Math.min(cols - 1, colRange.end)
  const useVirtual =
    !!virtualization && rowEnd >= rowStart && colEnd >= colStart
  const leftOffset = useVirtual ? colStart * virtualization.colWidth : 0
  const rightOffset = useVirtual
    ? Math.max(0, cols - colEnd - 1) * virtualization.colWidth
    : 0
  const topOffset = useVirtual ? rowStart * virtualization.rowHeight : 0
  const bottomOffset = useVirtual
    ? Math.max(0, rows - rowEnd - 1) * virtualization.rowHeight
    : 0
  const visibleCols = useVirtual ? colEnd - colStart + 1 : cols
  const columnSlots =
    (visibleCols > 0 ? visibleCols : 1) +
    (leftOffset > 0 ? 1 : 0) +
    (rightOffset > 0 ? 1 : 0)
  const rowIndexes = useVirtual
    ? Array.from({ length: rowEnd - rowStart + 1 }, (_, i) => rowStart + i)
    : Array.from({ length: rows }, (_, i) => i)
  const colIndexes = useVirtual
    ? Array.from({ length: colEnd - colStart + 1 }, (_, i) => colStart + i)
    : Array.from({ length: cols }, (_, i) => i)
  const activeDescendant = vm.focus
    ? `${idPrefix}-cell-${vm.focus.row}-${vm.focus.col}`
    : undefined
  const table = (
    <table
      tabIndex={0}
      role="grid"
      aria-rowcount={rows}
      aria-colcount={cols}
      aria-multiselectable={vm.selectionRange ? "true" : "false"}
      aria-activedescendant={activeDescendant}
      style={useVirtual ? { tableLayout: "fixed" } : undefined}
    >
      <tbody>
        {useVirtual && topOffset > 0 && (
          <tr role="presentation">
            <td
              role="presentation"
              aria-hidden="true"
              colSpan={columnSlots}
              style={{ height: topOffset, border: "none", padding: 0 }}
            />
          </tr>
        )}
        {rowIndexes.map(r => (
          <tr
            key={r}
            role="row"
            aria-rowindex={r + 1}
            style={useVirtual ? { height: virtualization?.rowHeight } : undefined}
          >
            {useVirtual && leftOffset > 0 && (
              <td
                role="presentation"
                aria-hidden="true"
                style={{ width: leftOffset, border: "none", padding: 0 }}
              />
            )}
            {colIndexes.map(c => {
              const cell = { row: r, col: c }
              const focused =
                vm.focus?.row === r && vm.focus?.col === c
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
                  style={
                    useVirtual
                      ? {
                        width: virtualization?.colWidth,
                        height: virtualization?.rowHeight
                      }
                      : undefined
                  }
                  onClick={event => {
                    if (event.shiftKey) {
                      const anchor =
                        vm.selection.anchor ?? vm.focus
                      if (!anchor) {
                        runtime.dispatch({
                          type: "SET_ANCHOR",
                          cell
                        })
                      }
                      runtime.dispatch({
                        type: "EXTEND_SELECTION",
                        cell
                      })
                      return
                    }
                    runtime.dispatch({
                      type: "SELECT_CELL",
                      cell
                    })
                  }}
                >
                  {renderCell(cell)}
                </td>
              )
            })}
            {useVirtual && rightOffset > 0 && (
              <td
                role="presentation"
                aria-hidden="true"
                style={{ width: rightOffset, border: "none", padding: 0 }}
              />
            )}
          </tr>
        ))}
        {useVirtual && bottomOffset > 0 && (
          <tr role="presentation">
            <td
              role="presentation"
              aria-hidden="true"
              colSpan={columnSlots}
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
    const cellLeft = focus.col * virtualization.colWidth
    const cellRight = cellLeft + virtualization.colWidth
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
  }, [virtualization, vm.focus, scroll.top, scroll.left])

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
