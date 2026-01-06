import type { Cell } from "./types"

export interface FocusPolicy {
  move(from: Cell, dx: number, dy: number): Cell
}
