import type { GridRuntime } from "@busted-grid/runtime"

export interface KeyboardBinding {
  dx: number
  dy: number
}

export interface KeyboardAdapterOptions {
  preventDefault?: boolean
  bindings?: Partial<Record<string, KeyboardBinding>>
}

const DEFAULT_BINDINGS: Record<string, KeyboardBinding> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 }
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}

function getHeaderControl(
  root: HTMLElement,
  col: number,
  control: "sort" | "filter"
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[data-busted-grid-header-control="${control}"][data-busted-grid-col="${col}"]`
  )
}

function getHeaderControlMeta(
  target: EventTarget | null
): { col: number; control: "sort" | "filter" } | null {
  if (!(target instanceof HTMLElement)) return null
  const control = target.getAttribute("data-busted-grid-header-control")
  const colText = target.getAttribute("data-busted-grid-col")
  if (!control || !colText) return null
  if (control !== "sort" && control !== "filter") return null
  const col = Number(colText)
  if (!Number.isFinite(col)) return null
  return { col, control }
}

export function attachKeyboard(
  element: HTMLElement,
  runtime: GridRuntime,
  options: KeyboardAdapterOptions = {}
): () => void {
  const { preventDefault = true, bindings = {} } = options

  const listener = (event: KeyboardEvent) => {
    const headerMeta = getHeaderControlMeta(event.target)
    if (headerMeta) {
      if (event.key === "Escape" || event.key === "F6" || event.key === "ArrowDown") {
        element.querySelector<HTMLElement>('table[role="grid"]')?.focus()
        if (preventDefault) event.preventDefault()
        return
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const direction = event.key === "ArrowLeft" ? -1 : 1

        if (event.altKey) {
          const vm = runtime.getViewModel()
          const header = vm.headers[headerMeta.col]
          if (header) {
            const delta = event.shiftKey ? 25 : 10
            runtime.dispatch({
              type: "SET_COLUMN_WIDTH",
              col: headerMeta.col,
              width: header.width + direction * delta
            })
          }
        } else {
          const nextCol = headerMeta.col + direction
          const next = getHeaderControl(element, nextCol, headerMeta.control)
          next?.focus()
        }

        if (preventDefault) event.preventDefault()
        return
      }

      return
    }

    if (isEditableElement(event.target)) {
      return
    }

    if (event.key === "ArrowUp" && !event.shiftKey) {
      const vm = runtime.getViewModel()
      if (vm.focus && vm.focus.row === 0) {
        const control = event.ctrlKey ? "filter" : "sort"
        const headerControl = getHeaderControl(element, vm.focus.col, control)
        if (headerControl) {
          headerControl.focus()
          if (preventDefault) event.preventDefault()
          return
        }
      }
    }

    if (event.key === "Enter") {
      const vm = runtime.getViewModel()
      if (vm.edit.status === "editing") {
        runtime.dispatch({
          type: "COMMIT_EDIT",
          value: vm.edit.value
        })
      } else if (vm.focus) {
        runtime.dispatch({
          type: "BEGIN_EDIT",
          cell: vm.focus
        })
      }
      if (preventDefault) {
        event.preventDefault()
      }
      return
    }

    if (event.key === "Escape") {
      runtime.dispatch({ type: "CANCEL_EDIT" })
      if (preventDefault) {
        event.preventDefault()
      }
      return
    }

    if (event.key === "F6") {
      const vm = runtime.getViewModel()
      const col = vm.focus?.col ?? 0
      const control = event.shiftKey ? "filter" : "sort"
      const headerControl = getHeaderControl(element, col, control)
      if (headerControl) {
        headerControl.focus()
        if (preventDefault) event.preventDefault()
      }
      return
    }

    if (event.key === "Tab") {
      const direction = event.shiftKey ? -1 : 1
      runtime.dispatch({ type: "MOVE_FOCUS", dx: direction, dy: 0 })
      if (preventDefault) {
        event.preventDefault()
      }
      return
    }

    const binding = bindings[event.key] ?? DEFAULT_BINDINGS[event.key]
    if (!binding) return

    if (event.shiftKey) {
      const vm = runtime.getViewModel()
      const focus = vm.focus
      if (!focus) {
        if (preventDefault) {
          event.preventDefault()
        }
        return
      }
      if (!vm.selection.anchor) {
        runtime.dispatch({ type: "SET_ANCHOR", cell: focus })
      }
      const moveResult = runtime.dispatch({
        type: "MOVE_FOCUS",
        dx: binding.dx,
        dy: binding.dy
      })
      if (moveResult.status === "applied") {
        const nextFocus = runtime.getViewModel().focus
        if (nextFocus) {
          runtime.dispatch({
            type: "EXTEND_SELECTION",
            cell: nextFocus
          })
        }
      }
    } else {
      runtime.dispatch({
        type: "MOVE_FOCUS",
        dx: binding.dx,
        dy: binding.dy
      })
    }

    if (preventDefault) {
      event.preventDefault()
    }
  }

  element.addEventListener("keydown", listener)

  return () => {
    element.removeEventListener("keydown", listener)
  }
}
