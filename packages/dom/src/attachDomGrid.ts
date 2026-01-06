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
  const rerender = () => renderGrid(container, runtime, options)
  const unsubscribe = runtime.subscribe(rerender)

  rerender()

  return {
    rerender,
    destroy() {
      unsubscribe()
      container.innerHTML = ""
    }
  }
}
