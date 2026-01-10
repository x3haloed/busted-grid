import type { GridRuntime } from "@busted-grid/runtime"
import { renderGrid, type DomGridOptions } from "./renderGrid.js"

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
    const activeElement = document.activeElement
    const headerControl =
      activeElement instanceof HTMLElement
        ? {
            control: activeElement.getAttribute("data-busted-grid-header-control"),
            col: activeElement.getAttribute("data-busted-grid-col")
          }
        : null

    renderGrid(container, runtime, options)

    if (
      headerControl?.control &&
      (headerControl.control === "sort" || headerControl.control === "filter") &&
      headerControl.col
    ) {
      const col = Number(headerControl.col)
      if (Number.isFinite(col)) {
        container
          .querySelector<HTMLElement>(
            `[data-busted-grid-header-control="${headerControl.control}"][data-busted-grid-col="${col}"]`
          )
          ?.focus()
      }
    }

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
  virtualization: { rowHeight: number }
): void {
  const focus = runtime.getViewModel().focus
  if (!focus) return
  const { rowHeight } = virtualization
  const viewHeight = container.clientHeight
  const viewWidth = container.clientWidth
  const cellTop = focus.row * rowHeight
  const cellBottom = cellTop + rowHeight
  const columns = runtime.getViewModel().columns
  let cellLeft = 0
  for (let c = 0; c < focus.col; c++) {
    cellLeft += columns[c]?.width ?? 120
  }
  const cellRight = cellLeft + (columns[focus.col]?.width ?? 120)
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
