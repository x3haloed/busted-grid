import type { Cell, ColumnState, EditState, SelectionState } from "./types"

export interface GridState {
  focus: Cell | null
  selection: SelectionState
  edit: EditState
  columns: ColumnState[]
}
