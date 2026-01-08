import type { GridRuntime } from "@busted-grid/runtime"
import { renderGrid, type DomGridOptions } from "./renderGrid"

export interface DomGridHandle {
  rerender(): void
  destroy(): void
}

export function attachDomGrid(
  container: HTMLElement,
  runtime: GridRuntime,
  options: DomGridOptions
): DomGridHandle {
  if (!options.idPrefix) {
    options.idPrefix = `busted-grid-${Math.random()
      .toString(36)
      .slice(2)}`
  }
  let lastFocusKey: string | null = null
  const rerender = () => {
    renderGrid(container, runtime, options)
    if (options.virtualization) {
      const focus = runtime.getViewModel().focus
      const focusKey = focus ? `${focus.row}:${focus.col}` : null
      if (focusKey && focusKey !== lastFocusKey) {
        ensureFocusVisible(container, runtime, options.virtualization)
      }
      lastFocusKey = focusKey
    }
  }
  const unsubscribe = runtime.subscribe(rerender)
  const onScroll = options.virtualization
    ? () => rerender()
    : undefined

  rerender()
  if (onScroll) {
    container.addEventListener("scroll", onScroll)
  }

  return {
    rerender,
    destroy() {
      unsubscribe()
      if (onScroll) {
        container.removeEventListener("scroll", onScroll)
      }
      container.innerHTML = ""
    }
  }
}

function ensureFocusVisible(
  container: HTMLElement,
  runtime: GridRuntime,
  virtualization: { rowHeight: number; colWidth: number }
): void {
  const focus = runtime.getViewModel().focus
  if (!focus) return
  const { rowHeight, colWidth } = virtualization
  const viewHeight = container.clientHeight
  const viewWidth = container.clientWidth
  const cellTop = focus.row * rowHeight
  const cellBottom = cellTop + rowHeight
  const cellLeft = focus.col * colWidth
  const cellRight = cellLeft + colWidth
  let nextTop = container.scrollTop
  let nextLeft = container.scrollLeft

  if (cellTop < nextTop) {
    nextTop = cellTop
  } else if (cellBottom > nextTop + viewHeight) {
    nextTop = cellBottom - viewHeight
  }

  if (cellLeft < nextLeft) {
    nextLeft = cellLeft
  } else if (cellRight > nextLeft + viewWidth) {
    nextLeft = cellRight - viewWidth
  }

  if (nextTop !== container.scrollTop) {
    container.scrollTop = nextTop
  }
  if (nextLeft !== container.scrollLeft) {
    container.scrollLeft = nextLeft
  }
}
