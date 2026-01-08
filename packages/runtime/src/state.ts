import type { Cell, ColumnState, SelectionState } from "./types"

export interface GridState {
  focus: Cell | null
  selection: SelectionState
  columns: ColumnState[]
}
