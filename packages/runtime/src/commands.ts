import type { Cell, SortDirection } from "./types.js"

export type GridCommand =
  | { type: "FOCUS_CELL"; cell: Cell }
  | { type: "MOVE_FOCUS"; dx: number; dy: number }
  | { type: "SELECT_CELL"; cell: Cell }
  | { type: "SET_ANCHOR"; cell: Cell }
  | { type: "EXTEND_SELECTION"; cell: Cell }
  | { type: "CLEAR_SELECTION" }
  | { type: "BEGIN_EDIT"; cell: Cell }
  | { type: "COMMIT_EDIT"; value: unknown }
  | { type: "CANCEL_EDIT" }
  // Header interactions are expressed as runtime commands, not adapter callbacks.
  | { type: "SET_COLUMN_SORT"; col: number; direction: SortDirection }
  | { type: "TOGGLE_COLUMN_SORT"; col: number }
  | { type: "SET_COLUMN_FILTER"; col: number; active: boolean }
  | { type: "SET_COLUMN_WIDTH"; col: number; width: number }
  | { type: "SET_COLUMN_LOCKED"; col: number; locked: boolean }
