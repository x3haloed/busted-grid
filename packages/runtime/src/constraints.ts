import type { Cell } from "./types"
import type { GridState } from "./state"

export interface GridConstraints {
  canFocus(cell: Cell, state: GridState): boolean
  canMoveFocus(from: Cell, to: Cell, state: GridState): boolean
  canSelect?(cell: Cell, state: GridState): boolean
  canSetAnchor?(cell: Cell, state: GridState): boolean
  canExtendSelection?(anchor: Cell, to: Cell, state: GridState): boolean
}
