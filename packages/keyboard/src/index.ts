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

export function attachKeyboard(
  element: HTMLElement,
  runtime: GridRuntime,
  options: KeyboardAdapterOptions = {}
): () => void {
  const { preventDefault = true, bindings = {} } = options

  const listener = (event: KeyboardEvent) => {
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
