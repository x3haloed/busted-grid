import type { SortDirection } from "./types.js"

export interface SortPolicy {
  nextSortDirection(current: SortDirection): SortDirection
}

export const defaultSortPolicy: SortPolicy = {
  nextSortDirection(current) {
    if (current === "asc") return "desc"
    if (current === "desc") return null
    return "asc"
  }
}
