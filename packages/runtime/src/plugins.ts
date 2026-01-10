import type { GridCommand } from "./commands.js"
import type { GridConstraints } from "./constraints.js"
import type { DispatchResult } from "./dispatch.js"
import type { EditPolicy } from "./editPolicy.js"
import type { FocusPolicy } from "./focusPolicy.js"
import type { SelectionPolicy } from "./selectionPolicy.js"
import type { SortPolicy } from "./sortPolicy.js"
import type { GridState } from "./state.js"

export interface CommandContext {
  state: GridState
  constraints: GridConstraints
  focusPolicy: FocusPolicy
  selectionPolicy: SelectionPolicy
  editPolicy: EditPolicy
  sortPolicy: SortPolicy
}

export type CommandValidationResult =
  | { ok: true }
  | { ok: false; reason?: string }

export interface CommandHookResult {
  command?: GridCommand
  cancel?: boolean
  reason?: string
}

export interface GridCommandPlugin {
  name?: string
  validateCommand?(
    command: GridCommand,
    context: CommandContext
  ): CommandValidationResult
  beforeCommand?(
    command: GridCommand,
    context: CommandContext
  ): CommandHookResult | void
  afterCommand?(
    command: GridCommand,
    context: CommandContext,
    result: DispatchResult
  ): void
}
