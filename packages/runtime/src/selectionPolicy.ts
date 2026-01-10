import type { GridState } from "./state.js"
import type { Cell, SelectionState } from "./types.js"

export interface SelectionPolicy {
    select(cell: Cell, state: GridState): SelectionState
    setAnchor(cell: Cell, state: GridState): SelectionState
    extendSelection(cell: Cell, state: GridState): SelectionState
}

export const excelSelectionPolicy: SelectionPolicy = {
    select(cell: Cell, _state: GridState): SelectionState {
        return {
            anchor: cell,
            rangeEnd: cell
        }
    },

    setAnchor(cell: Cell, _state: GridState): SelectionState {
        return {
            anchor: cell,
            rangeEnd: cell
        }
    },

    extendSelection(cell: Cell, state: GridState): SelectionState {
        const anchor = state.selection.anchor ?? state.focus
        if (!anchor) {
            return {
                anchor: cell,
                rangeEnd: cell
            }
        }
        return {
            anchor,
            rangeEnd: cell
        }
    }
}

export const vimSelectionPolicy: SelectionPolicy = {
    select(cell: Cell, _state: GridState): SelectionState {
        return {
            anchor: cell,
            rangeEnd: cell
        }
    },

    setAnchor(cell: Cell, _state: GridState): SelectionState {
        return {
            anchor: cell,
            rangeEnd: cell
        }
    },

    extendSelection(cell: Cell, state: GridState): SelectionState {
        const anchor = state.selection.anchor ?? state.focus
        if (!anchor) {
            return {
                anchor: cell,
                rangeEnd: cell
            }
        }
        return {
            anchor,
            rangeEnd: cell
        }
    }
}

export const defaultSelectionPolicy = excelSelectionPolicy
