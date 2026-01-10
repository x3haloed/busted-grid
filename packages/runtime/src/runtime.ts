import type { GridCommand } from "./commands.js"
import type { GridConstraints } from "./constraints.js"
import type { DispatchResult } from "./dispatch.js"
import { defaultEditPolicy, type EditPolicy } from "./editPolicy.js"
import type { FocusPolicy } from "./focusPolicy.js"
import {
  defaultSelectionPolicy,
  type SelectionPolicy
} from "./selectionPolicy.js"
import type { CommandContext, GridCommandPlugin } from "./plugins.js"
import type { GridState } from "./state.js"
import type {
  EditState,
  GridViewModel,
  SelectionRange,
  SelectionState,
  ViewportConfig
} from "./types.js"
import { deriveViewport } from "./viewport.js"

export interface GridRuntimeOptions {
  state: GridState
  constraints: GridConstraints
  focusPolicy: FocusPolicy
  selectionPolicy?: SelectionPolicy
  editPolicy?: EditPolicy
  plugins?: GridCommandPlugin[]
}

export class GridRuntime {
  private state: GridState
  private constraints: GridConstraints
  private focusPolicy: FocusPolicy
  private selectionPolicy: SelectionPolicy
  private editPolicy: EditPolicy
  private plugins: GridCommandPlugin[]
  private listeners = new Set<() => void>()

  constructor(options: GridRuntimeOptions) {
    this.state = options.state
    this.constraints = options.constraints
    this.focusPolicy = options.focusPolicy
    this.selectionPolicy = options.selectionPolicy ?? defaultSelectionPolicy
    this.editPolicy = options.editPolicy ?? defaultEditPolicy
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
          this.state.selection = this.selectionPolicy.select(
            command.cell,
            this.state
          )
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
          this.state.selection = this.selectionPolicy.setAnchor(
            command.cell,
            this.state
          )
          changed = true
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "EXTEND_SELECTION": {
        if (
          this.constraints.canFocus(command.cell, this.state) &&
          (this.constraints.canExtendSelection?.(
            this.state.selection.anchor ?? this.state.focus!,
            command.cell,
            this.state
          ) ??
            true)
        ) {
          this.state.focus = command.cell
          this.state.selection = this.selectionPolicy.extendSelection(
            command.cell,
            this.state
          )
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

      case "BEGIN_EDIT": {
        if (this.state.edit.status === "committing") {
          blocked = true
          reason = "committing"
          break
        }
        if (
          this.constraints.canFocus(command.cell, this.state) &&
          (this.constraints.canBeginEdit?.(command.cell, this.state) ??
            true) &&
          (this.editPolicy.canBeginEdit?.(command.cell, this.state) ??
            true)
        ) {
          this.state.focus = command.cell
          this.state.selection = {
            anchor: command.cell,
            rangeEnd: command.cell
          }
          this.state.edit = {
            status: "editing",
            cell: command.cell
          }
          changed = true
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "COMMIT_EDIT": {
        if (this.state.edit.status !== "editing" || !this.state.edit.cell) {
          ignored = true
          reason = "not-editing"
          break
        }
        const cell = this.state.edit.cell
        if (
          (this.constraints.canCommitEdit?.(
            cell,
            command.value,
            this.state
          ) ??
            true) &&
          (this.editPolicy.canCommitEdit?.(
            cell,
            command.value,
            this.state
          ) ??
            true)
        ) {
          this.state.edit = {
            status: "committing",
            cell,
            value: command.value
          }
          changed = true
          const result = this.editPolicy.commitEdit?.(
            cell,
            command.value,
            this.state
          )
          if (result && isPromise(result)) {
            result
              .then(() => {
                this.editPolicy.onCommitSuccess?.(
                  cell,
                  command.value,
                  this.state
                )
                this.state.edit = idleEditState()
                this.notify()
              })
              .catch(error => {
                this.editPolicy.onCommitError?.(
                  cell,
                  command.value,
                  error,
                  this.state
                )
                this.state.edit = {
                  status: "error",
                  cell,
                  value: command.value,
                  error
                }
                this.notify()
              })
          } else {
            this.editPolicy.onCommitSuccess?.(
              cell,
              command.value,
              this.state
            )
            this.state.edit = idleEditState()
          }
        } else {
          blocked = true
          reason = "constraint"
        }
        break
      }

      case "CANCEL_EDIT": {
        if (this.state.edit.status === "committing") {
          blocked = true
          reason = "committing"
          break
        }
        if (this.state.edit.status === "editing") {
          this.state.edit = idleEditState()
          changed = true
        } else {
          ignored = true
          reason = "not-editing"
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

  getViewModel(viewport?: ViewportConfig): GridViewModel {
    return {
      focus: this.state.focus,
      selection: { ...this.state.selection },
      selectionRange: getSelectionRange(this.state.selection),
      edit: { ...this.state.edit },
      columns: [...this.state.columns],
      viewport: viewport ? deriveViewport(viewport) : undefined
    }
  }

  replaceFocusPolicy(policy: FocusPolicy): void {
    this.focusPolicy = policy
  }

  replaceConstraints(constraints: GridConstraints): void {
    this.constraints = constraints
  }

  replaceEditPolicy(policy: EditPolicy): void {
    this.editPolicy = policy
  }

  replaceSelectionPolicy(policy: SelectionPolicy): void {
    this.selectionPolicy = policy
  }

  private createContext(): CommandContext {
    return {
      state: this.state,
      constraints: this.constraints,
      focusPolicy: this.focusPolicy,
      selectionPolicy: this.selectionPolicy,
      editPolicy: this.editPolicy
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

function idleEditState(): EditState {
  return { status: "idle", cell: null }
}

function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as Promise<unknown>).then === "function"
  )
}
