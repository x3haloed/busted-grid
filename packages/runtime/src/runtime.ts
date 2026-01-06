import type { GridCommand } from "./commands"
import type { GridConstraints } from "./constraints"
import type { FocusPolicy } from "./focusPolicy"
import type { GridState } from "./state"
import type { GridViewModel } from "./types"

export interface GridRuntimeOptions {
  state: GridState
  constraints: GridConstraints
  focusPolicy: FocusPolicy
}

export class GridRuntime {
  private state: GridState
  private constraints: GridConstraints
  private focusPolicy: FocusPolicy
  private listeners = new Set<() => void>()

  constructor(options: GridRuntimeOptions) {
    this.state = options.state
    this.constraints = options.constraints
    this.focusPolicy = options.focusPolicy
  }

  dispatch(cmd: GridCommand): void {
    let changed = false

    switch (cmd.type) {
      case "FOCUS_CELL": {
        if (this.constraints.canFocus(cmd.cell, this.state)) {
          this.state.focus = cmd.cell
          changed = true
        }
        break
      }

      case "MOVE_FOCUS": {
        if (!this.state.focus) break
        const next = this.focusPolicy.move(
          this.state.focus,
          cmd.dx,
          cmd.dy
        )
        if (
          this.constraints.canMoveFocus(
            this.state.focus,
            next,
            this.state
          )
        ) {
          this.state.focus = next
          changed = true
        }
        break
      }

      case "SELECT_CELL": {
        this.state.selection = [cmd.cell]
        changed = true
        break
      }
    }

    if (changed) {
      this.notify()
    }
  }

  getViewModel(): GridViewModel {
    return {
      focus: this.state.focus,
      selection: [...this.state.selection],
      columns: [...this.state.columns]
    }
  }

  replaceFocusPolicy(policy: FocusPolicy): void {
    this.focusPolicy = policy
  }

  replaceConstraints(constraints: GridConstraints): void {
    this.constraints = constraints
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
