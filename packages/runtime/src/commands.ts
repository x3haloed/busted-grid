import type { Cell } from "./types"

export type GridCommand =
  | { type: "FOCUS_CELL"; cell: Cell }
  | { type: "MOVE_FOCUS"; dx: number; dy: number }
  | { type: "SELECT_CELL"; cell: Cell }
