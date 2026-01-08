import type { GridViewport, ViewportConfig, VisibleRange } from "./types.js"

const DEFAULT_OVERSCAN = 2

export function deriveViewport(config: ViewportConfig): GridViewport {
  const rows = Math.max(0, config.rows | 0)
  const cols = Math.max(0, config.cols | 0)
  const rowHeight = Math.max(1, config.rowHeight)
  const colWidth = Math.max(1, config.colWidth)
  const viewportHeight = Math.max(0, config.viewportHeight)
  const viewportWidth = Math.max(0, config.viewportWidth)
  const scrollTop = Math.max(0, config.scrollTop)
  const scrollLeft = Math.max(0, config.scrollLeft)
  const overscan = Math.max(0, config.overscan ?? DEFAULT_OVERSCAN)

  return {
    rows,
    cols,
    rowHeight,
    colWidth,
    viewportHeight,
    viewportWidth,
    scrollTop,
    scrollLeft,
    overscan,
    rowRange: getRange(scrollTop, viewportHeight, rowHeight, rows, overscan),
    colRange: getRange(scrollLeft, viewportWidth, colWidth, cols, overscan)
  }
}

function getRange(
  offset: number,
  viewportSize: number,
  cellSize: number,
  count: number,
  overscan: number
): VisibleRange {
  if (count <= 0) return { start: 0, end: -1 }
  const start = Math.max(
    0,
    Math.floor(offset / cellSize) - overscan
  )
  const end = Math.min(
    count - 1,
    Math.floor((offset + viewportSize) / cellSize) + overscan
  )
  return { start, end }
}
