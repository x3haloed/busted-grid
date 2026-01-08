import type { Cell } from "./types.js"

export interface FocusPolicy {
  move(from: Cell, dx: number, dy: number): Cell
}
