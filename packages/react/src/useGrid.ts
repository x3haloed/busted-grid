import * as React from "react"
import type {
  GridRuntime,
  GridViewModel,
  ViewportConfig
} from "@busted-grid/runtime"

export function useGrid(
  runtime: GridRuntime,
  viewport?: ViewportConfig
): GridViewModel {
  return React.useSyncExternalStore(
    listener => runtime.subscribe(listener),
    () => runtime.getViewModel(viewport),
    () => runtime.getViewModel(viewport)
  )
}
