import type {
  Cell,
  GridRuntime,
  GridViewModel
} from "@busted-grid/runtime"

export interface DomGridClassNames {
  table?: string
  cell?: string
  focusedCell?: string
  selectedCell?: string
}

export interface DomGridOptions {
  rows: number
  cols: number
  classNames?: DomGridClassNames
  cellFormatter?: (cell: Cell, vm: GridViewModel) => string
}

const defaultCellFormatter = (cell: Cell): string => `${cell.row},${cell.col}`

export function renderGrid(
  container: HTMLElement,
  runtime: GridRuntime,
  options: DomGridOptions
): void {
  const { rows, cols, classNames, cellFormatter } = options
  const formatCell = cellFormatter ?? defaultCellFormatter
  const vm = runtime.getViewModel()
  const selectionRange = vm.selectionRange

  container.innerHTML = ""

  const table = document.createElement("table")
  table.tabIndex = 0
  if (classNames?.table) {
    table.classList.add(classNames.table)
  }

  for (let r = 0; r < rows; r++) {
    const tr = document.createElement("tr")

    for (let c = 0; c < cols; c++) {
      const td = document.createElement("td")
      const cell = { row: r, col: c }
      const isFocused = vm.focus?.row === r && vm.focus?.col === c
      const isSelected =
        !!selectionRange &&
        r >= selectionRange.start.row &&
        r <= selectionRange.end.row &&
        c >= selectionRange.start.col &&
        c <= selectionRange.end.col

      if (classNames?.cell) td.classList.add(classNames.cell)
      if (isFocused) {
        td.classList.add(classNames?.focusedCell ?? "focused")
      }
      if (isSelected) {
        td.classList.add(classNames?.selectedCell ?? "selected")
      }

      td.textContent = formatCell(cell, vm)
      td.onclick = () => runtime.dispatch({ type: "SELECT_CELL", cell })

      tr.appendChild(td)
    }

    table.appendChild(tr)
  }

  container.appendChild(table)
}
