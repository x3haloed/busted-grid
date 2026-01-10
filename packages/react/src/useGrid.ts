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
  const runtimeRef = React.useRef(runtime)
  const viewportRef = React.useRef(viewport)
  const snapshotRef = React.useRef(runtime.getViewModel(viewport))

  if (runtimeRef.current !== runtime) {
    runtimeRef.current = runtime
    viewportRef.current = viewport
    snapshotRef.current = runtime.getViewModel(viewport)
  } else if (viewportRef.current !== viewport) {
    viewportRef.current = viewport
    snapshotRef.current = runtime.getViewModel(viewport)
  }

  return React.useSyncExternalStore(
    listener =>
      runtime.subscribe(() => {
        snapshotRef.current = runtime.getViewModel(viewportRef.current)
        listener()
      }),
    () => snapshotRef.current,
    () => snapshotRef.current
  )
}
