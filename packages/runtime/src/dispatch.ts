export type DispatchStatus = "applied" | "blocked" | "cancelled" | "ignored"

export interface DispatchResult {
  status: DispatchStatus
  reason?: string
}
