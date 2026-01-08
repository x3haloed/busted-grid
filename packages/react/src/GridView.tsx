import * as React from "react"
import type { Cell, GridRuntime } from "@busted-grid/runtime"
import { useGrid } from "./useGrid"

export interface GridViewProps {
  runtime: GridRuntime
  rows: number
  cols: number
  renderCell?: (cell: Cell) => React.ReactNode
}

const defaultRenderer = (cell: Cell) => `${cell.row},${cell.col}`

export function GridView({
  runtime,
  rows,
  cols,
  renderCell = defaultRenderer
}: GridViewProps): JSX.Element {
  const vm = useGrid(runtime)

  return (
    <table tabIndex={0}>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => {
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

              return (
                <td
                  key={c}
                  data-focused={focused || undefined}
                  data-selected={selected || undefined}
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
          </tr>
        ))}
      </tbody>
    </table>
  )
}
