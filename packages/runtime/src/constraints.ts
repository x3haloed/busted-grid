import type { Cell, SortDirection } from "./types.js"
import type { GridState } from "./state.js"

export interface GridConstraints {
  canFocus(cell: Cell, state: GridState): boolean
  canMoveFocus(from: Cell, to: Cell, state: GridState): boolean
  canSelect?(cell: Cell, state: GridState): boolean
  canSetAnchor?(cell: Cell, state: GridState): boolean
  canExtendSelection?(anchor: Cell, to: Cell, state: GridState): boolean
  canBeginEdit?(cell: Cell, state: GridState): boolean
  canCommitEdit?(cell: Cell, value: unknown, state: GridState): boolean
  canSortColumn?(col: number, direction: SortDirection, state: GridState): boolean
  canFilterColumn?(col: number, active: boolean, state: GridState): boolean
  canResizeColumn?(col: number, width: number, state: GridState): boolean
  canLockColumn?(col: number, locked: boolean, state: GridState): boolean
}
