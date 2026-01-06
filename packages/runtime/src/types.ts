export type Cell = {
  row: number
  col: number
}

export interface ColumnState {
  width: number
  locked: boolean
}

export interface GridViewModel {
  focus: Cell | null
  selection: Cell[]
  columns: ColumnState[]
}
