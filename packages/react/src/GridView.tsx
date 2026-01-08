import * as React from "react"
import type { Cell, GridRuntime } from "@busted-grid/runtime"
import { useGrid } from "./useGrid"

export interface GridViewProps {
  runtime: GridRuntime
  rows: number
  cols: number
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
  renderCell = defaultRenderer,
  virtualization
}: GridViewProps): JSX.Element {
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
  const table = (
    <table tabIndex={0} style={useVirtual ? { tableLayout: "fixed" } : undefined}>
      <tbody>
        {useVirtual && topOffset > 0 && (
          <tr>
            <td colSpan={columnSlots} style={{ height: topOffset }} />
          </tr>
        )}
        {rowIndexes.map(r => (
          <tr key={r} style={useVirtual ? { height: virtualization?.rowHeight } : undefined}>
            {useVirtual && leftOffset > 0 && (
              <td style={{ width: leftOffset }} />
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
                  style={
                    useVirtual
                      ? {
                          width: virtualization?.colWidth,
                          height: virtualization?.rowHeight
                        }
                      : undefined
                  }
                  onClick={() =>
                    runtime.dispatch({
                      type: "SELECT_CELL",
                      cell
                    })
                  }
                >
                  {renderCell(cell)}
                </td>
              )
            })}
            {useVirtual && rightOffset > 0 && (
              <td style={{ width: rightOffset }} />
            )}
          </tr>
        ))}
        {useVirtual && bottomOffset > 0 && (
          <tr>
            <td colSpan={columnSlots} style={{ height: bottomOffset }} />
          </tr>
        )}
      </tbody>
    </table>
  )

  if (!virtualization) {
    return table
  }

  return (
    <div
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
