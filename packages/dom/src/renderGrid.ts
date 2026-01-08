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
  editingCell?: string
}

export interface DomGridOptions {
  rows: number
  cols: number
  classNames?: DomGridClassNames
  cellFormatter?: (cell: Cell, vm: GridViewModel) => string
  virtualization?: {
    rowHeight: number
    colWidth: number
    overscan?: number
  }
}

const defaultCellFormatter = (cell: Cell): string => `${cell.row},${cell.col}`

export function renderGrid(
  container: HTMLElement,
  runtime: GridRuntime,
  options: DomGridOptions
): void {
  const { rows, cols, classNames, cellFormatter, virtualization } = options
  const formatCell = cellFormatter ?? defaultCellFormatter
  const viewport = virtualization
    ? {
        rows,
        cols,
        rowHeight: virtualization.rowHeight,
        colWidth: virtualization.colWidth,
        viewportHeight: container.clientHeight,
        viewportWidth: container.clientWidth,
        scrollTop: container.scrollTop,
        scrollLeft: container.scrollLeft,
        overscan: virtualization.overscan
      }
    : undefined
  const vm = runtime.getViewModel(viewport)
  const selectionRange = vm.selectionRange
  const edit = vm.edit
  const rowRange = vm.viewport?.rowRange ?? { start: 0, end: rows - 1 }
  const colRange = vm.viewport?.colRange ?? { start: 0, end: cols - 1 }

  container.innerHTML = ""

  const table = document.createElement("table")
  table.tabIndex = 0
  if (classNames?.table) {
    table.classList.add(classNames.table)
  }

  const rowStart = Math.max(0, rowRange.start)
  const rowEnd = Math.min(rows - 1, rowRange.end)
  const colStart = Math.max(0, colRange.start)
  const colEnd = Math.min(cols - 1, colRange.end)
  const useVirtual = !!virtualization && rowEnd >= rowStart && colEnd >= colStart
  const rowHeight = virtualization?.rowHeight
  const colWidth = virtualization?.colWidth
  const leftOffset = useVirtual ? colStart * (colWidth ?? 0) : 0
  const rightOffset = useVirtual
    ? Math.max(0, cols - colEnd - 1) * (colWidth ?? 0)
    : 0
  const topOffset = useVirtual ? rowStart * (rowHeight ?? 0) : 0
  const bottomOffset = useVirtual
    ? Math.max(0, rows - rowEnd - 1) * (rowHeight ?? 0)
    : 0
  const visibleCols = useVirtual ? colEnd - colStart + 1 : cols
  const columnSlots =
    (visibleCols > 0 ? visibleCols : 1) +
    (leftOffset > 0 ? 1 : 0) +
    (rightOffset > 0 ? 1 : 0)

  if (useVirtual && topOffset > 0) {
    const spacerRow = document.createElement("tr")
    const spacerCell = document.createElement("td")
    spacerCell.colSpan = columnSlots
    spacerCell.style.height = `${topOffset}px`
    spacerRow.appendChild(spacerCell)
    table.appendChild(spacerRow)
  }

  for (let r = useVirtual ? rowStart : 0; r <= (useVirtual ? rowEnd : rows - 1); r++) {
    const tr = document.createElement("tr")
    if (rowHeight) {
      tr.style.height = `${rowHeight}px`
    }

    if (useVirtual && leftOffset > 0) {
      const spacer = document.createElement("td")
      spacer.style.width = `${leftOffset}px`
      tr.appendChild(spacer)
    }

    for (let c = useVirtual ? colStart : 0; c <= (useVirtual ? colEnd : cols - 1); c++) {
      const td = document.createElement("td")
      const cell = { row: r, col: c }
      const isFocused = vm.focus?.row === r && vm.focus?.col === c
      const isSelected =
        !!selectionRange &&
        r >= selectionRange.start.row &&
        r <= selectionRange.end.row &&
        c >= selectionRange.start.col &&
        c <= selectionRange.end.col
      const isEditing =
        edit.status === "editing" &&
        !!edit.cell &&
        edit.cell.row === r &&
        edit.cell.col === c

      if (classNames?.cell) td.classList.add(classNames.cell)
      if (isFocused) {
        td.classList.add(classNames?.focusedCell ?? "focused")
      }
      if (isSelected) {
        td.classList.add(classNames?.selectedCell ?? "selected")
      }
      if (isEditing) {
        td.classList.add(classNames?.editingCell ?? "editing")
      }
      if (colWidth) {
        td.style.width = `${colWidth}px`
      }
      if (rowHeight) {
        td.style.height = `${rowHeight}px`
      }

      td.textContent = formatCell(cell, vm)
      td.onclick = () => runtime.dispatch({ type: "SELECT_CELL", cell })

      tr.appendChild(td)
    }

    if (useVirtual && rightOffset > 0) {
      const spacer = document.createElement("td")
      spacer.style.width = `${rightOffset}px`
      tr.appendChild(spacer)
    }

    table.appendChild(tr)
  }

  if (useVirtual && bottomOffset > 0) {
    const spacerRow = document.createElement("tr")
    const spacerCell = document.createElement("td")
    spacerCell.colSpan = columnSlots
    spacerCell.style.height = `${bottomOffset}px`
    spacerRow.appendChild(spacerCell)
    table.appendChild(spacerRow)
  }

  container.appendChild(table)
}
