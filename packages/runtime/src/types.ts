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

export type SortDirection = "asc" | "desc" | null

export interface ColumnState {
  width: number
  locked: boolean
  label?: string
  sort?: SortDirection
  filterActive?: boolean
}

export interface ColumnHeaderState {
  col: number
  label: string
  width: number
  locked: boolean
  sort: SortDirection
  filterActive: boolean
  canSort: boolean
  canFilter: boolean
  canResize: boolean
}

export interface VisibleRange {
  start: number
  end: number
}

export interface ViewportConfig {
  rows: number
  cols: number
  rowHeight: number
  viewportHeight: number
  scrollTop: number
  viewportWidth?: number
  scrollLeft?: number
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
  headers: ColumnHeaderState[]
  viewport?: GridViewport
}
