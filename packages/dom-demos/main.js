import {
  GridRuntime,
  defaultEditPolicy
} from "../runtime/dist/index.js"
import { attachDomGrid } from "../dom/dist/index.js"
import { attachKeyboard } from "../keyboard/dist/index.js"

const rows = 200
const cols = 40
const columnWidth = 100
const minColumnWidth = 80
const maxColumnWidth = 160
const rowHeight = 28
const container = document.getElementById("grid-container")
const statusEl = document.getElementById("status")
const commandLog = document.getElementById("command-log")
const randomizeButton = document.getElementById("randomize")
const clearStatusButton = document.getElementById("clear-errors")
const selectionGuardButton = document.getElementById("toggle-selection-guard")

const selectionGuard = { enabled: false }

const state = {
  focus: null,
  selection: { anchor: null, rangeEnd: null },
  edit: { status: "idle", cell: null },
  columns: Array.from({ length: cols }, (_, index) => ({
    width: columnWidth,
    label: columnLabel(index)
  }))
}

const data = new Map()

function cellKey(cell) {
  return `${cell.row}:${cell.col}`
}

function getValue(cell) {
  if (!data.has(cellKey(cell))) {
    data.set(cellKey(cell), cell.row * cols + cell.col)
  }
  return data.get(cellKey(cell))
}

function setStatus(message, tone = "info") {
  if (!statusEl) return
  statusEl.textContent = message
  statusEl.style.color =
    tone === "error" ? "#b91c1c" : "#0f172a"
}

function logCommand(command, result) {
  if (!commandLog) return
  const entry = document.createElement("li")
  const reason = result.reason ? ` (${result.reason})` : ""
  entry.textContent = `${command.type}: ${result.status}${reason}`
  if (commandLog.firstChild) {
    commandLog.insertBefore(entry, commandLog.firstChild)
  } else {
    commandLog.appendChild(entry)
  }
  while (commandLog.children.length > 6) {
    commandLog.removeChild(commandLog.lastChild)
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let requestRender = () => { }

function columnLabel(index) {
  let label = ""
  let value = index
  while (value >= 0) {
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  }
  return label
}

const editPolicy = {
  ...defaultEditPolicy,
  commitEdit: async (cell, value) => {
    await delay(300)
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error("Value must be a number.")
    }
    if (value < 0) {
      throw new Error("Negative values are not allowed.")
    }
    data.set(cellKey(cell), value)
    setStatus(`Saved ${value} at ${cell.row},${cell.col}.`)
    requestRender()
  },
  onCommitError: (_cell, _value, error) => {
    const message =
      error instanceof Error ? error.message : "Commit failed."
    setStatus(message, "error")
  },
  onCommitSuccess: () => {
    setStatus("Saved.")
  }
}

const constraints = {
  canFocus(cell) {
    return (
      cell.row >= 0 &&
      cell.row < rows &&
      cell.col >= 0 &&
      cell.col < cols
    )
  },
  canMoveFocus(_from, to) {
    return (
      to.row >= 0 &&
      to.row < rows &&
      to.col >= 0 &&
      to.col < cols
    )
  },
  canSortColumn(col) {
    return col % 3 !== 0
  },
  canFilterColumn(col) {
    return col % 4 !== 0
  },
  canResizeColumn(_col, width) {
    return width >= minColumnWidth && width <= maxColumnWidth
  }
}

const focusPolicy = {
  move(from, dx, dy) {
    return { row: from.row + dy, col: from.col + dx }
  }
}

const demoPlugin = {
  name: "demo-guard",
  beforeCommand(command) {
    if (!selectionGuard.enabled) return
    if (command.type === "EXTEND_SELECTION") {
      return { cancel: true, reason: "selection-guard" }
    }
  },
  afterCommand(command, _context, result) {
    logCommand(command, result)
    if (result.status === "cancelled") {
      if (result.reason === "selection-guard") {
        setStatus("Selection guard blocked range expansion.", "error")
        return
      }
    }
    if (result.status === "blocked") {
      setStatus(`Command blocked: ${command.type}.`, "error")
    }
  }
}

const runtime = new GridRuntime({
  state,
  constraints,
  focusPolicy,
  editPolicy,
  plugins: [demoPlugin]
})

function formatCell(cell, vm) {
  const value = getValue(cell)
  const isEditing =
    vm.edit.cell &&
    vm.edit.cell.row === cell.row &&
    vm.edit.cell.col === cell.col

  if (!isEditing) return `${value}`

  switch (vm.edit.status) {
    case "editing":
      return `${value} (edit)`
    case "committing":
      return `${value} (committing)`
    case "error":
      return `${value} (error)`
    default:
      return `${value}`
  }
}

const domHandle = attachDomGrid(container, runtime, {
  rows,
  cols,
  idPrefix: "demo-grid",
  stickyHeader: true,
  virtualization: {
    rowHeight,
    overscan: 2
  },
  headerFormatter: header => formatHeader(header),
  cellFormatter: formatCell
})

requestRender = () => {
  domHandle.rerender()
}

function formatHeader(header) {
  const wrapper = document.createElement("div")
  wrapper.className = "header-inner"

  const sortButton = document.createElement("button")
  sortButton.type = "button"
  sortButton.tabIndex = -1
  sortButton.className = "header-label"
  sortButton.dataset.bustedGridHeaderControl = "sort"
  sortButton.dataset.bustedGridCol = String(header.col)
  sortButton.textContent = header.sort ? `${header.label} (${header.sort})` : header.label
  sortButton.disabled = !header.canSort
  sortButton.addEventListener("click", () => {
    runtime.dispatch({ type: "TOGGLE_COLUMN_SORT", col: header.col })
  })

  const actions = document.createElement("div")
  actions.className = "header-actions"

  const filterButton = document.createElement("button")
  filterButton.type = "button"
  filterButton.tabIndex = -1
  filterButton.dataset.bustedGridHeaderControl = "filter"
  filterButton.dataset.bustedGridCol = String(header.col)
  filterButton.textContent = header.filterActive ? "Filter on" : "Filter"
  filterButton.disabled = !header.canFilter
  filterButton.addEventListener("click", () => {
    runtime.dispatch({
      type: "SET_COLUMN_FILTER",
      col: header.col,
      active: !header.filterActive
    })
  })

  const shrinkButton = document.createElement("button")
  shrinkButton.type = "button"
  shrinkButton.tabIndex = -1
  shrinkButton.textContent = "W-"
  shrinkButton.disabled = !header.canResize
  shrinkButton.addEventListener("click", () => {
    runtime.dispatch({
      type: "SET_COLUMN_WIDTH",
      col: header.col,
      width: header.width - 10
    })
  })

  const growButton = document.createElement("button")
  growButton.type = "button"
  growButton.tabIndex = -1
  growButton.textContent = "W+"
  growButton.disabled = !header.canResize
  growButton.addEventListener("click", () => {
    runtime.dispatch({
      type: "SET_COLUMN_WIDTH",
      col: header.col,
      width: header.width + 10
    })
  })
  actions.append(filterButton, shrinkButton, growButton)
  wrapper.append(sortButton, actions)
  return wrapper
}

class CellEditor {
  constructor() {
    this.element = document.createElement("input")
    this.element.className = "cell-editor"
    this.element.style.display = "none"
    this.element.style.position = "absolute"
    document.body.appendChild(this.element)

    this.element.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        this.commit()
      } else if (event.key === "Escape") {
        this.cancel()
      }
    })

    this.element.addEventListener("blur", () => {
      if (this.element.style.display !== "none") {
        this.commit()
      }
    })
  }

  show(cell, value) {
    const td = document.getElementById(`demo-grid-cell-${cell.row}-${cell.col}`)
    if (!td) return

    const rect = td.getBoundingClientRect()
    this.element.value = String(value)
    this.element.style.top = `${rect.top + window.scrollY}px`
    this.element.style.left = `${rect.left + window.scrollX}px`
    this.element.style.width = `${rect.width}px`
    this.element.style.height = `${rect.height}px`
    this.element.style.display = "block"
    this.element.focus()
    this.element.select()
  }

  hide() {
    this.element.style.display = "none"
  }

  commit() {
    const value = Number(this.element.value)
    this.hide()
    runtime.dispatch({ type: "COMMIT_EDIT", value })
    // Return focus to grid table
    container.querySelector("table")?.focus()
  }

  cancel() {
    this.hide()
    runtime.dispatch({ type: "CANCEL_EDIT" })
    // Return focus to grid table
    container.querySelector("table")?.focus()
  }
}

const cellEditor = new CellEditor()

// Hook into runtime state changes to show/hide editor
runtime.subscribe(() => {
  const vm = runtime.getViewModel()
  if (vm.edit.status === "editing" && vm.edit.cell) {
    cellEditor.show(vm.edit.cell, getValue(vm.edit.cell))
  } else {
    cellEditor.hide()
  }
})

attachKeyboard(container, runtime)

// Ensure grid gets focus when clicked
container.addEventListener("mousedown", () => {
  // Use a short delay to allow the click to update state before focusing
  setTimeout(() => {
    container.querySelector("table")?.focus()
  }, 0)
})

container.addEventListener(
  "keydown",
  event => {
    if (event.key !== "Enter") return

    const vm = runtime.getViewModel()
    if (vm.edit.status !== "idle") return

    // Just let the library handle BEGIN_EDIT, our subscriber will show the UI
  },
  true
)

randomizeButton?.addEventListener("click", () => {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      data.set(cellKey({ row: r, col: c }), Math.floor(Math.random() * 200))
    }
  }
  setStatus("Randomized data.")
  requestRender()
})

clearStatusButton?.addEventListener("click", () => {
  setStatus("Ready.")
})

selectionGuardButton?.addEventListener("click", () => {
  selectionGuard.enabled = !selectionGuard.enabled
  selectionGuardButton.textContent = selectionGuard.enabled
    ? "Selection Guard: On"
    : "Selection Guard: Off"
  setStatus(
    selectionGuard.enabled
      ? "Selection guard enabled."
      : "Selection guard disabled."
  )
})

setStatus("Ready.")
