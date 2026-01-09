import {
  GridRuntime,
  defaultEditPolicy
} from "../runtime/dist/index.js"
import { attachDomGrid } from "../dom/dist/index.js"
import { attachKeyboard } from "../keyboard/dist/index.js"

const rows = 200
const cols = 40
const container = document.getElementById("grid-container")
const statusEl = document.getElementById("status")
const randomizeButton = document.getElementById("randomize")
const clearStatusButton = document.getElementById("clear-errors")

const state = {
  focus: null,
  selection: { anchor: null, rangeEnd: null },
  edit: { status: "idle", cell: null },
  columns: Array.from({ length: cols }, () => ({
    width: 100,
    locked: false
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let requestRender = () => { }

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
  }
}

const focusPolicy = {
  move(from, dx, dy) {
    return { row: from.row + dy, col: from.col + dx }
  }
}

const runtime = new GridRuntime({
  state,
  constraints,
  focusPolicy,
  editPolicy
})

function formatCell(cell, vm) {
  const value = getValue(cell)
  const isEditing =
    vm.edit.cell &&
    vm.edit.cell.row === cell.row &&
    vm.edit.cell.col === cell.col

  if (!isEditing) return String(value)

  switch (vm.edit.status) {
    case "editing":
      return `${value} (edit)`
    case "committing":
      return `${value} (committing)`
    case "error":
      return `${value} (error)`
    default:
      return String(value)
  }
}

const domHandle = attachDomGrid(container, runtime, {
  rows,
  cols,
  idPrefix: "demo-grid",
  virtualization: {
    rowHeight: 28,
    colWidth: 100,
    overscan: 2
  },
  cellFormatter: formatCell
})

requestRender = () => domHandle.rerender()

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
  domHandle.rerender()
})

clearStatusButton?.addEventListener("click", () => {
  setStatus("Ready.")
})

setStatus("Ready.")
