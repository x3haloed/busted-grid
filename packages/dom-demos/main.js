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

let requestRender = () => {}

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
  const editing =
    vm.edit.status === "editing" &&
    vm.edit.cell &&
    vm.edit.cell.row === cell.row &&
    vm.edit.cell.col === cell.col
  return editing ? `${value} (edit)` : String(value)
}

const domHandle = attachDomGrid(container, runtime, {
  rows,
  cols,
  virtualization: {
    rowHeight: 28,
    colWidth: 100,
    overscan: 2
  },
  cellFormatter: formatCell
})

requestRender = () => domHandle.rerender()

attachKeyboard(container, runtime)

container.addEventListener(
  "keydown",
  event => {
    if (event.key !== "Enter") return
    event.preventDefault()
    event.stopPropagation()
    const vm = runtime.getViewModel()
    const targetCell = vm.focus ?? vm.selection.anchor
    if (!targetCell) return
    runtime.dispatch({ type: "BEGIN_EDIT", cell: targetCell })
    const currentValue = getValue(targetCell)
    const raw = window.prompt(
      `Edit ${targetCell.row},${targetCell.col}`,
      String(currentValue)
    )
    if (raw === null) {
      runtime.dispatch({ type: "CANCEL_EDIT" })
      return
    }
    const nextValue = Number(raw)
    runtime.dispatch({ type: "COMMIT_EDIT", value: nextValue })
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
