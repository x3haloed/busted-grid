import {
  GridRuntime,
  defaultEditPolicy
} from "../runtime/dist/index.js"
import { attachDomGrid } from "../dom/dist/index.js"
import { attachKeyboard } from "../keyboard/dist/index.js"

const rows = 200
const cols = 40
const columnWidth = 100
const rowHeight = 28
const container = document.getElementById("grid-container")
const header = document.getElementById("grid-header")
const headerTrack = document.getElementById("grid-header-track")
const statusEl = document.getElementById("status")
const commandLog = document.getElementById("command-log")
const randomizeButton = document.getElementById("randomize")
const clearStatusButton = document.getElementById("clear-errors")
const selectionGuardButton = document.getElementById("toggle-selection-guard")

const lockedColumns = new Set([0, 1])
const selectionGuard = { enabled: false }

const state = {
  focus: null,
  selection: { anchor: null, rangeEnd: null },
  edit: { status: "idle", cell: null },
  columns: Array.from({ length: cols }, (_, index) => ({
    width: columnWidth,
    locked: lockedColumns.has(index)
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

function isLockedColumn(col) {
  return lockedColumns.has(col)
}

function setColumnLocked(col, locked) {
  if (locked) {
    lockedColumns.add(col)
  } else {
    lockedColumns.delete(col)
  }
  const column = state.columns[col]
  if (column) {
    column.locked = locked
  }
}

const editPolicy = {
  ...defaultEditPolicy,
  commitEdit: async (cell, value) => {
    await delay(300)
    if (isLockedColumn(cell.col)) {
      throw new Error(`Column ${columnLabel(cell.col)} is locked.`)
    }
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
  canBeginEdit(cell) {
    return !isLockedColumn(cell.col)
  },
  canCommitEdit(cell) {
    return !isLockedColumn(cell.col)
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
      if (command.type === "BEGIN_EDIT" && "cell" in command) {
        setStatus(
          `Column ${columnLabel(command.cell.col)} is locked.`,
          "error"
        )
        return
      }
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
  const lockedTag = isLockedColumn(cell.col) ? " [RO]" : ""
  const isEditing =
    vm.edit.cell &&
    vm.edit.cell.row === cell.row &&
    vm.edit.cell.col === cell.col

  if (!isEditing) return `${value}${lockedTag}`

  switch (vm.edit.status) {
    case "editing":
      return `${value}${lockedTag} (edit)`
    case "committing":
      return `${value}${lockedTag} (committing)`
    case "error":
      return `${value}${lockedTag} (error)`
    default:
      return `${value}${lockedTag}`
  }
}

const domHandle = attachDomGrid(container, runtime, {
  rows,
  cols,
  idPrefix: "demo-grid",
  virtualization: {
    rowHeight,
    colWidth: columnWidth,
    overscan: 2
  },
  cellFormatter: formatCell
})

function renderHeader() {
  if (!headerTrack) return
  headerTrack.innerHTML = ""
  headerTrack.style.width = `${cols * columnWidth}px`
  for (let c = 0; c < cols; c++) {
    const cell = document.createElement("div")
    cell.className = "header-cell"
    cell.dataset.col = String(c)
    cell.dataset.locked = isLockedColumn(c) ? "true" : "false"

    const label = document.createElement("span")
    label.className = "header-label"
    label.textContent = `Col ${columnLabel(c)}`

    const lockButton = document.createElement("button")
    lockButton.type = "button"
    lockButton.textContent = isLockedColumn(c) ? "Unlock" : "Lock"
    lockButton.addEventListener("click", () => {
      const nextLocked = !isLockedColumn(c)
      setColumnLocked(c, nextLocked)
      setStatus(
        nextLocked
          ? `Locked column ${columnLabel(c)}.`
          : `Unlocked column ${columnLabel(c)}.`
      )
      requestRender()
    })

    cell.append(label, lockButton)
    headerTrack.appendChild(cell)
  }
}

function syncHeaderScroll() {
  if (!header) return
  header.scrollLeft = container.scrollLeft
}

requestRender = () => {
  domHandle.rerender()
  renderHeader()
}
renderHeader()

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
container.addEventListener("scroll", syncHeaderScroll)

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
  domHandle.rerender()
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
