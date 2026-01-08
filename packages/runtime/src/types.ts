export type Cell = {
  row: number
  col: number
}

export type EditStatus = "idle" | "editing" | "committing" | "error"

export interface EditState {
  status: EditStatus
  cell: Cell | null
  value?: unknown
  error?: unknown
}

export interface SelectionState {
  anchor: Cell | null
  rangeEnd: Cell | null
}

export interface SelectionRange {
  start: Cell
  end: Cell
}

export interface ColumnState {
  width: number
  locked: boolean
}

export interface VisibleRange {
  start: number
  end: number
}

export interface ViewportConfig {
  rows: number
  cols: number
  rowHeight: number
  colWidth: number
  viewportHeight: number
  viewportWidth: number
  scrollTop: number
  scrollLeft: number
  overscan?: number
}

export interface GridViewport extends ViewportConfig {
  rowRange: VisibleRange
  colRange: VisibleRange
  overscan: number
}

export interface GridViewModel {
  focus: Cell | null
  selection: SelectionState
  selectionRange: SelectionRange | null
  edit: EditState
  columns: ColumnState[]
  viewport?: GridViewport
}
