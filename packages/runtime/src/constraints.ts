import type { Cell } from "./types"
import type { GridState } from "./state"

export interface GridConstraints {
  canFocus(cell: Cell, state: GridState): boolean
  canMoveFocus(from: Cell, to: Cell, state: GridState): boolean
}
