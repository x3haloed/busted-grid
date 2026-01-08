import type { Cell } from "./types.js"
import type { GridState } from "./state.js"

export interface EditPolicy {
  canBeginEdit?(cell: Cell, state: GridState): boolean
  canCommitEdit?(cell: Cell, value: unknown, state: GridState): boolean
  commitEdit?(cell: Cell, value: unknown, state: GridState): void | Promise<void>
  onCommitSuccess?(cell: Cell, value: unknown, state: GridState): void
  onCommitError?(
    cell: Cell,
    value: unknown,
    error: unknown,
    state: GridState
  ): void
}

export const defaultEditPolicy: EditPolicy = {
  canBeginEdit: () => true,
  canCommitEdit: () => true
}
