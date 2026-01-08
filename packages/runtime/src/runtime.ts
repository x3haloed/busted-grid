import type { GridCommand } from "./commands"
import type { GridConstraints } from "./constraints"
import type { DispatchResult } from "./dispatch"
import type { FocusPolicy } from "./focusPolicy"
import type { CommandContext, GridCommandPlugin } from "./plugins"
import type { GridState } from "./state"
import type { GridViewModel, SelectionRange, SelectionState } from "./types"

export interface GridRuntimeOptions {
  state: GridState
  constraints: GridConstraints
  focusPolicy: FocusPolicy
  plugins?: GridCommandPlugin[]
}

export class GridRuntime {
  private state: GridState
  private constraints: GridConstraints
  private focusPolicy: FocusPolicy
  private plugins: GridCommandPlugin[]
  private listeners = new Set<() => void>()

  constructor(options: GridRuntimeOptions) {
    this.state = options.state
    this.constraints = options.constraints
    this.focusPolicy = options.focusPolicy
    this.plugins = options.plugins ?? []
  }

  dispatchAll(commands: GridCommand[]): DispatchResult[] {
    const results: DispatchResult[] = []
    for (const command of commands) {
      results.push(this.dispatch(command))
    }
    return results
  }

  dispatch(command: GridCommand): DispatchResult {
    const context = this.createContext()
    const validation = this.validateCommand(command, context)
    if (!validation.ok) {
      const result: DispatchResult = {
        status: "blocked",
        reason: validation.reason
      }
      this.runAfterHooks(command, context, result)
      return result
    }

    const before = this.runBeforeHooks(command, context)
    if (before.cancel) {
      const result: DispatchResult = {
        status: "cancelled",
        reason: before.reason
      }
      this.runAfterHooks(command, context, result)
      return result
    }

    const nextCommand = before.command ?? command
    const result = this.applyCommand(nextCommand)
    if (result.status === "applied") {
      this.notify()
    }
    this.runAfterHooks(nextCommand, context, result)
    return result
  }

  private applyCommand(command: GridCommand): DispatchResult {
    let changed = false
    let blocked = false
    let ignored = false
    let reason: string | undefined

    switch (command.type) {
      case "FOCUS_CELL": {
        if (this.constraints.canFocus(command.cell, this.state)) {
          this.state.focus = command.cell
          changed = true
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "MOVE_FOCUS": {
        if (!this.state.focus) {
          ignored = true
          reason = "no-focus"
          break
        }
        const next = this.focusPolicy.move(
          this.state.focus,
          command.dx,
          command.dy
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
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "SELECT_CELL": {
        if (
          this.constraints.canFocus(command.cell, this.state) &&
          (this.constraints.canSelect?.(command.cell, this.state) ?? true)
        ) {
          this.state.focus = command.cell
          this.state.selection = {
            anchor: command.cell,
            rangeEnd: command.cell
          }
          changed = true
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "SET_ANCHOR": {
        if (
          this.constraints.canFocus(command.cell, this.state) &&
          (this.constraints.canSetAnchor?.(command.cell, this.state) ?? true)
        ) {
          this.state.focus = command.cell
          this.state.selection = {
            anchor: command.cell,
            rangeEnd: command.cell
          }
          changed = true
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "EXTEND_SELECTION": {
        const anchor = this.state.selection.anchor ?? this.state.focus
        if (!anchor) {
          ignored = true
          reason = "no-anchor"
          break
        }
        if (
          this.constraints.canFocus(command.cell, this.state) &&
          (this.constraints.canExtendSelection?.(
            anchor,
            command.cell,
            this.state
          ) ??
            true)
        ) {
          this.state.focus = command.cell
          this.state.selection = {
            anchor,
            rangeEnd: command.cell
          }
          changed = true
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "CLEAR_SELECTION": {
        if (this.state.selection.anchor || this.state.selection.rangeEnd) {
          this.state.selection = { anchor: null, rangeEnd: null }
          changed = true
        } else {
          ignored = true
          reason = "empty"
        }
        break
      }
    }

    if (changed) {
      return { status: "applied" }
    }

    if (blocked) {
      return { status: "blocked", reason }
    }

    if (ignored) {
      return { status: "ignored", reason }
    }

    return { status: "ignored" }
  }

  getViewModel(): GridViewModel {
    return {
      focus: this.state.focus,
      selection: { ...this.state.selection },
      selectionRange: getSelectionRange(this.state.selection),
      columns: [...this.state.columns]
    }
  }

  replaceFocusPolicy(policy: FocusPolicy): void {
    this.focusPolicy = policy
  }

  replaceConstraints(constraints: GridConstraints): void {
    this.constraints = constraints
  }

  private createContext(): CommandContext {
    return {
      state: this.state,
      constraints: this.constraints,
      focusPolicy: this.focusPolicy
    }
  }

  private validateCommand(
    command: GridCommand,
    context: CommandContext
  ): { ok: boolean; reason?: string } {
    for (const plugin of this.plugins) {
      const result = plugin.validateCommand?.(command, context)
      if (result && !result.ok) {
        return result
      }
    }
    return { ok: true }
  }

  private runBeforeHooks(
    command: GridCommand,
    context: CommandContext
  ): { command?: GridCommand; cancel?: boolean; reason?: string } {
    let nextCommand = command
    for (const plugin of this.plugins) {
      const result = plugin.beforeCommand?.(nextCommand, context)
      if (!result) continue
      if (result.cancel) {
        return { cancel: true, reason: result.reason }
      }
      if (result.command) {
        nextCommand = result.command
      }
    }
    return { command: nextCommand }
  }

  private runAfterHooks(
    command: GridCommand,
    context: CommandContext,
    result: DispatchResult
  ): void {
    for (const plugin of this.plugins) {
      plugin.afterCommand?.(command, context, result)
    }
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

function getSelectionRange(selection: SelectionState): SelectionRange | null {
  if (!selection.anchor || !selection.rangeEnd) return null
  const startRow = Math.min(selection.anchor.row, selection.rangeEnd.row)
  const endRow = Math.max(selection.anchor.row, selection.rangeEnd.row)
  const startCol = Math.min(selection.anchor.col, selection.rangeEnd.col)
  const endCol = Math.max(selection.anchor.col, selection.rangeEnd.col)
  return {
    start: { row: startRow, col: startCol },
    end: { row: endRow, col: endCol }
  }
}
