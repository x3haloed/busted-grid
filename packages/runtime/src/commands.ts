import type { Cell } from "./types"

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
