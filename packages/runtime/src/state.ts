import type { Cell, ColumnState } from "./types"

export interface GridState {
  focus: Cell | null
  selection: Cell[]
  columns: ColumnState[]
}
