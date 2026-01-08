import type { GridCommand } from "./commands"
import type { GridConstraints } from "./constraints"
import type { DispatchResult } from "./dispatch"
import type { FocusPolicy } from "./focusPolicy"
import type { GridState } from "./state"

export interface CommandContext {
  state: GridState
  constraints: GridConstraints
  focusPolicy: FocusPolicy
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
