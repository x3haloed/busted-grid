import type {
  Cell,
  ColumnHeaderState,
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
  headerFormatter?: (
    header: ColumnHeaderState,
    vm: GridViewModel
  ) => string | HTMLElement
  virtualization?: {
    rowHeight: number
    overscan?: number
  }
  idPrefix?: string
}

const defaultCellFormatter = (cell: Cell): string => `${cell.row},${cell.col}`

export function renderGrid(
  container: HTMLElement,
  runtime: GridRuntime,
  options: DomGridOptions
): void {
  const {
    rows,
    cols,
    classNames,
    cellFormatter,
    headerFormatter,
    virtualization,
    idPrefix
  } =
    options
  const formatCell = cellFormatter ?? defaultCellFormatter
  const formatHeader = headerFormatter
  const viewport = virtualization
    ? {
        rows,
        cols,
        rowHeight: virtualization.rowHeight,
        viewportHeight: container.clientHeight,
        scrollTop: container.scrollTop,
        overscan: virtualization.overscan
      }
    : undefined
  const vm = runtime.getViewModel(viewport)
  const selectionRange = vm.selectionRange
  const edit = vm.edit
  const rowRange = vm.viewport?.rowRange ?? { start: 0, end: rows - 1 }

  container.innerHTML = ""

  const table = document.createElement("table")
  table.tabIndex = 0
  table.setAttribute("role", "grid")
  table.setAttribute("aria-rowcount", String(rows + 1))
  table.setAttribute("aria-colcount", String(cols))
  table.setAttribute(
    "aria-multiselectable",
    selectionRange ? "true" : "false"
  )
  if (vm.focus) {
    table.setAttribute(
      "aria-activedescendant",
      getCellId(vm.focus.row, vm.focus.col, idPrefix)
    )
  }
  if (virtualization) {
    table.style.tableLayout = "fixed"
  }
  if (classNames?.table) {
    table.classList.add(classNames.table)
  }

  const rowStart = Math.max(0, rowRange.start)
  const rowEnd = Math.min(rows - 1, rowRange.end)
  const useVirtual = !!virtualization && rowEnd >= rowStart
  const rowHeight = virtualization?.rowHeight
  const topOffset = useVirtual ? rowStart * (rowHeight ?? 0) : 0
  const bottomOffset = useVirtual
    ? Math.max(0, rows - rowEnd - 1) * (rowHeight ?? 0)
    : 0

  const colgroup = document.createElement("colgroup")
  for (let c = 0; c < cols; c++) {
    const col = document.createElement("col")
    col.style.width = `${vm.columns[c]?.width ?? 120}px`
    colgroup.appendChild(col)
  }
  table.appendChild(colgroup)

  const thead = document.createElement("thead")
  const headerRow = document.createElement("tr")
  headerRow.setAttribute("role", "row")
  headerRow.setAttribute("aria-rowindex", "1")
  for (let c = 0; c < cols; c++) {
    const header = vm.headers[c] ?? {
      col: c,
      label: `Column ${c + 1}`,
      width: vm.columns[c]?.width ?? 120,
      sort: null,
      filterActive: false,
      canSort: true,
      canFilter: true,
      canResize: true
    }
    const th = document.createElement("th")
    th.setAttribute("role", "columnheader")
    th.setAttribute("scope", "col")
    th.setAttribute("aria-colindex", String(c + 1))
    th.setAttribute(
      "aria-sort",
      header.sort === "asc"
        ? "ascending"
        : header.sort === "desc"
          ? "descending"
          : "none"
    )

    const content = formatHeader?.(header, vm)
    if (typeof content === "string" || content == null) {
      th.textContent = content ?? header.label
    } else {
      th.appendChild(content)
    }

    th.onclick = event => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest("button")) return
      runtime.dispatch({ type: "TOGGLE_COLUMN_SORT", col: c })
    }
    headerRow.appendChild(th)
  }
  thead.appendChild(headerRow)
  table.appendChild(thead)

  const tbody = document.createElement("tbody")
  if (useVirtual && topOffset > 0) {
    const spacerRow = document.createElement("tr")
    spacerRow.setAttribute("role", "presentation")
    spacerRow.setAttribute("aria-hidden", "true")
    const spacerCell = document.createElement("td")
    spacerCell.setAttribute("role", "presentation")
    spacerCell.setAttribute("aria-hidden", "true")
    spacerCell.colSpan = cols
    spacerCell.style.height = `${topOffset}px`
    spacerCell.style.border = "none"
    spacerCell.style.padding = "0"
    spacerRow.appendChild(spacerCell)
    tbody.appendChild(spacerRow)
  }

  for (
    let r = useVirtual ? rowStart : 0;
    r <= (useVirtual ? rowEnd : rows - 1);
    r++
  ) {
    const tr = document.createElement("tr")
    tr.setAttribute("role", "row")
    tr.setAttribute("aria-rowindex", String(r + 2))
    if (rowHeight) {
      tr.style.height = `${rowHeight}px`
    }

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
      td.setAttribute("role", "gridcell")
      td.setAttribute("aria-colindex", String(c + 1))
      td.setAttribute("aria-selected", isSelected ? "true" : "false")
      td.id = getCellId(r, c, idPrefix)
      if (rowHeight) {
        td.style.height = `${rowHeight}px`
      }

      td.textContent = formatCell(cell, vm)
      td.onclick = event => {
        const mouseEvent = event as MouseEvent
        if (mouseEvent.shiftKey) {
          const current = runtime.getViewModel()
          const anchor = current.selection.anchor ?? current.focus
          if (!anchor) {
            runtime.dispatch({ type: "SET_ANCHOR", cell })
          }
          runtime.dispatch({ type: "EXTEND_SELECTION", cell })
          return
        }
        runtime.dispatch({ type: "SELECT_CELL", cell })
      }

      tr.appendChild(td)
    }

    tbody.appendChild(tr)
  }

  if (useVirtual && bottomOffset > 0) {
    const spacerRow = document.createElement("tr")
    spacerRow.setAttribute("role", "presentation")
    spacerRow.setAttribute("aria-hidden", "true")
    const spacerCell = document.createElement("td")
    spacerCell.setAttribute("role", "presentation")
    spacerCell.setAttribute("aria-hidden", "true")
    spacerCell.colSpan = cols
    spacerCell.style.height = `${bottomOffset}px`
    spacerCell.style.border = "none"
    spacerCell.style.padding = "0"
    spacerRow.appendChild(spacerCell)
    tbody.appendChild(spacerRow)
  }

  table.appendChild(tbody)
  container.appendChild(table)
}

function getCellId(row: number, col: number, idPrefix?: string): string {
  const prefix = idPrefix ?? "busted-grid"
  return `${prefix}-cell-${row}-${col}`
}
