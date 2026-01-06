import * as React from "react"
import type { GridRuntime, GridViewModel } from "@busted-grid/runtime"

export function useGrid(runtime: GridRuntime): GridViewModel {
  return React.useSyncExternalStore(
    listener => runtime.subscribe(listener),
    () => runtime.getViewModel(),
    () => runtime.getViewModel()
  )
}
