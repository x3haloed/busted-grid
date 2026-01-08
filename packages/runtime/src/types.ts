export type Cell = {
  row: number
  col: number
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

export interface GridViewModel {
  focus: Cell | null
  selection: SelectionState
  selectionRange: SelectionRange | null
  columns: ColumnState[]
}
