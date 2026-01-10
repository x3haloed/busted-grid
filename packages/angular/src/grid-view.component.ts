import { CommonModule } from "@angular/common"
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from "@angular/core"
import type {
  Cell,
  GridRuntime,
  GridViewModel
} from "@busted-grid/runtime"

export interface GridCellTemplateContext {
  $implicit: Cell
  cell: Cell
}

@Component({
  selector: "busted-grid-view",
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      .grid-scroller {
        display: block;
      }

      table {
        border-collapse: collapse;
      }

      th,
      td {
        border: 1px solid #ccc;
        padding: 4px 8px;
      }

      td[data-focused] {
        outline: 2px solid #3b82f6;
        outline-offset: -2px;
      }

      td[data-selected] {
        background: #dbeafe;
      }

      td[data-editing] {
        outline: 2px solid #f59e0b;
        outline-offset: -2px;
      }

      td.spacer {
        border: none;
        padding: 0;
      }

      th.grid-header-cell {
        padding: 0;
        text-align: left;
      }

      .grid-header-inner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        position: relative;
      }

      .grid-header-label,
      .grid-header-filter {
        border: 1px solid transparent;
        background: none;
        padding: 2px 4px;
        cursor: pointer;
        font: inherit;
      }

      .grid-header-label:disabled,
      .grid-header-filter:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .grid-header-resize {
        position: absolute;
        right: 0;
        top: 0;
        width: 6px;
        height: 100%;
        cursor: col-resize;
      }

      .grid-header-resize[data-disabled="true"] {
        cursor: not-allowed;
        opacity: 0.4;
      }
    `
  ],
  template: `
    <div
      class="grid-scroller"
      #scroller
      [style.height.px]="virtualization?.height"
      [style.width.px]="virtualization?.width"
      [style.overflow]="virtualization ? 'auto' : null"
      (scroll)="onScroll($event)"
    >
      <table
        tabindex="0"
        role="grid"
        [attr.aria-rowcount]="rows + 1"
        [attr.aria-colcount]="cols"
        [attr.aria-multiselectable]="vm.selectionRange ? 'true' : 'false'"
        [attr.aria-activedescendant]="activeDescendantId()"
      >
        <colgroup>
          <col
            *ngFor="let colWidth of colWidths; trackBy: trackCol"
            [style.width.px]="colWidth"
          />
        </colgroup>
        <thead>
          <tr role="row" aria-rowindex="1">
            <th
              *ngFor="let header of headers; trackBy: trackCol"
              role="columnheader"
              scope="col"
              class="grid-header-cell"
              [attr.aria-colindex]="header.col + 1"
              [attr.aria-sort]="ariaSort(header.sort)"
              [attr.data-filter]="header.filterActive ? '' : null"
              [attr.data-sort]="header.sort ?? 'none'"
            >
              <div class="grid-header-inner">
                <button
                  type="button"
                  tabindex="-1"
                  class="grid-header-label"
                  (click)="toggleSort(header.col)"
                  [disabled]="!header.canSort"
                >
                  {{ header.label }}
                  <span *ngIf="header.sort">({{ header.sort }})</span>
                </button>
                <button
                  type="button"
                  tabindex="-1"
                  class="grid-header-filter"
                  (click)="toggleFilter(header.col)"
                  [attr.aria-pressed]="header.filterActive"
                  [disabled]="!header.canFilter"
                >
                  Filter
                </button>
                <div
                  class="grid-header-resize"
                  role="presentation"
                  (pointerdown)="startResize(header, $event)"
                  [attr.data-disabled]="!header.canResize ? 'true' : null"
                ></div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="virtualization && topOffset > 0" role="presentation">
            <td
              class="spacer"
              role="presentation"
              aria-hidden="true"
              [attr.colspan]="cols"
              [style.height.px]="topOffset"
            ></td>
          </tr>
          <tr
            *ngFor="let r of rowIndexes; trackBy: trackRow"
            role="row"
            [attr.aria-rowindex]="r + 2"
            [style.height.px]="virtualization?.rowHeight"
          >
            <td
              *ngFor="let c of colIndexes; trackBy: trackCol"
              [attr.data-focused]="isFocused(r, c) ? '' : null"
              [attr.data-selected]="isSelected(r, c) ? '' : null"
              [attr.data-editing]="isEditing(r, c) ? '' : null"
              role="gridcell"
              [attr.aria-colindex]="c + 1"
              [attr.aria-selected]="isSelected(r, c) ? 'true' : 'false'"
              [attr.id]="cellId(r, c)"
              [style.height.px]="virtualization?.rowHeight"
              (click)="onCellClick(r, c, $event)"
            >
              <ng-container *ngIf="cellTemplate; else defaultCell"
                [ngTemplateOutlet]="cellTemplate"
                [ngTemplateOutletContext]="cellContext(r, c)"
              ></ng-container>
              <ng-template #defaultCell>
                {{ r }},{{ c }}
              </ng-template>
            </td>
          </tr>
          <tr *ngIf="virtualization && bottomOffset > 0" role="presentation">
            <td
              class="spacer"
              role="presentation"
              aria-hidden="true"
              [attr.colspan]="cols"
              [style.height.px]="bottomOffset"
            ></td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GridViewComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input({ required: true }) runtime!: GridRuntime
  @Input({ required: true }) rows!: number
  @Input({ required: true }) cols!: number
  @Input() cellTemplate?: TemplateRef<GridCellTemplateContext>
  @Input() virtualization?: {
    rowHeight: number
    width: number
    height: number
    overscan?: number
  }

  vm: GridViewModel = {
    focus: null,
    selection: { anchor: null, rangeEnd: null },
    selectionRange: null,
    edit: { status: "idle", cell: null },
    columns: [],
    headers: []
  }
  rowIndexes: number[] = []
  colIndexes: number[] = []
  headers: GridViewModel["headers"] = []
  colWidths: number[] = []
  readonly idPrefix = `busted-grid-${Math.random()
    .toString(36)
    .slice(2)}`
  @ViewChild("scroller") scroller?: ElementRef<HTMLDivElement>
  rowStart = 0
  rowEnd = -1
  topOffset = 0
  bottomOffset = 0
  private scrollTop = 0
  private scrollLeft = 0
  private lastFocusKey: string | null = null

  readonly trackRow = (_idx: number, row: number) => row
  readonly trackCol = (_idx: number, col: number) => col

  private unsubscribeRuntime?: () => void

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.rowIndexes = createIndexArray(this.rows)
    this.colIndexes = createIndexArray(this.cols)
    this.attachRuntime()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["rows"] && !changes["rows"].isFirstChange()) {
      this.rowIndexes = createIndexArray(this.rows)
    }
    if (changes["cols"] && !changes["cols"].isFirstChange()) {
      this.colIndexes = createIndexArray(this.cols)
    }
    if (changes["virtualization"] && !changes["virtualization"].isFirstChange()) {
      this.updateViewModel()
    }
    if (changes["runtime"] && !changes["runtime"].isFirstChange()) {
      this.attachRuntime()
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe()
  }

  onCellClick(row: number, col: number, event: MouseEvent): void {
    if (!this.runtime) return
    const cell = { row, col }
    if (event.shiftKey) {
      const anchor = this.vm.selection.anchor ?? this.vm.focus
      if (!anchor) {
        this.runtime.dispatch({ type: "SET_ANCHOR", cell })
      }
      this.runtime.dispatch({ type: "EXTEND_SELECTION", cell })
      return
    }
    this.runtime.dispatch({ type: "SELECT_CELL", cell })
  }

  isFocused(row: number, col: number): boolean {
    const focus = this.vm.focus
    return !!focus && focus.row === row && focus.col === col
  }

  isSelected(row: number, col: number): boolean {
    const range = this.vm.selectionRange
    if (!range) return false
    return (
      row >= range.start.row &&
      row <= range.end.row &&
      col >= range.start.col &&
      col <= range.end.col
    )
  }

  isEditing(row: number, col: number): boolean {
    const edit = this.vm.edit
    return (
      edit.status === "editing" &&
      !!edit.cell &&
      edit.cell.row === row &&
      edit.cell.col === col
    )
  }

  cellId(row: number, col: number): string {
    return `${this.idPrefix}-cell-${row}-${col}`
  }

  activeDescendantId(): string | null {
    const focus = this.vm.focus
    if (!focus) return null
    return this.cellId(focus.row, focus.col)
  }

  onScroll(event: Event): void {
    if (!this.virtualization) return
    const target = event.target as HTMLElement
    this.scrollTop = target.scrollTop
    this.scrollLeft = target.scrollLeft
    this.updateViewModel()
  }

  toggleSort(col: number): void {
    this.runtime.dispatch({ type: "TOGGLE_COLUMN_SORT", col })
  }

  toggleFilter(col: number): void {
    const header = this.headers.find(item => item.col === col)
    this.runtime.dispatch({
      type: "SET_COLUMN_FILTER",
      col,
      active: !(header?.filterActive ?? false)
    })
  }

  ariaSort(sort: GridViewModel["headers"][number]["sort"]): string {
    if (sort === "asc") return "ascending"
    if (sort === "desc") return "descending"
    return "none"
  }

  startResize(
    header: GridViewModel["headers"][number],
    event: PointerEvent
  ): void {
    if (!header.canResize) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = header.width
    const move = (moveEvent: PointerEvent) => {
      const nextWidth = Math.max(
        20,
        Math.round(startWidth + (moveEvent.clientX - startX))
      )
      this.runtime.dispatch({
        type: "SET_COLUMN_WIDTH",
        col: header.col,
        width: nextWidth
      })
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  cellContext(row: number, col: number): GridCellTemplateContext {
    const cell = { row, col }
    return { $implicit: cell, cell }
  }

  private attachRuntime(): void {
    this.unsubscribe()
    if (!this.runtime) return

    this.vm = this.runtime.getViewModel(this.getViewportConfig())
    this.updateVirtualization()
    this.unsubscribeRuntime = this.runtime.subscribe(() => {
      this.updateViewModel()
    })
    this.cdr.markForCheck()
  }

  private unsubscribe(): void {
    this.unsubscribeRuntime?.()
    this.unsubscribeRuntime = undefined
  }

  private updateViewModel(): void {
    if (!this.runtime) return
    this.vm = this.runtime.getViewModel(this.getViewportConfig())
    this.updateVirtualization()
    this.ensureFocusVisible()
    this.cdr.markForCheck()
  }

  private getViewportConfig() {
    if (!this.virtualization) return undefined
    return {
      rows: this.rows,
      cols: this.cols,
      rowHeight: this.virtualization.rowHeight,
      viewportHeight: this.virtualization.height,
      scrollTop: this.scrollTop,
      overscan: this.virtualization.overscan
    }
  }

  private updateVirtualization(): void {
    this.headers = this.vm.headers
    this.colWidths = createIndexArray(this.cols).map(
      idx => this.vm.columns[idx]?.width ?? 120
    )

    if (!this.virtualization || !this.vm.viewport) {
      this.rowIndexes = createIndexArray(this.rows)
      this.colIndexes = createIndexArray(this.cols)
      this.rowStart = 0
      this.rowEnd = this.rows - 1
      this.topOffset = 0
      this.bottomOffset = 0
      return
    }

    const rowRange = this.vm.viewport.rowRange
    this.rowStart = Math.max(0, rowRange.start)
    this.rowEnd = Math.min(this.rows - 1, rowRange.end)

    if (this.rowEnd < this.rowStart) {
      this.rowIndexes = []
      this.topOffset = 0
      this.bottomOffset = 0
      return
    }

    this.rowIndexes = createIndexArray(this.rowEnd - this.rowStart + 1).map(
      idx => this.rowStart + idx
    )
    this.colIndexes = createIndexArray(this.cols)
    this.topOffset = this.rowStart * this.virtualization.rowHeight
    this.bottomOffset =
      Math.max(0, this.rows - this.rowEnd - 1) *
      this.virtualization.rowHeight
  }

  private ensureFocusVisible(): void {
    if (!this.virtualization) return
    const focus = this.vm.focus
    if (!focus) {
      this.lastFocusKey = null
      return
    }
    const focusKey = `${focus.row}:${focus.col}`
    if (focusKey === this.lastFocusKey) return
    this.lastFocusKey = focusKey
    const scroller = this.scroller?.nativeElement
    if (!scroller) return
    const viewHeight = this.virtualization.height
    const viewWidth = this.virtualization.width
    const cellTop = focus.row * this.virtualization.rowHeight
    const cellBottom = cellTop + this.virtualization.rowHeight
    const cellLeft = this.colWidths
      .slice(0, focus.col)
      .reduce((sum, width) => sum + width, 0)
    const cellRight = cellLeft + (this.colWidths[focus.col] ?? 120)
    let nextTop = scroller.scrollTop
    let nextLeft = scroller.scrollLeft

    if (cellTop < nextTop) {
      nextTop = cellTop
    } else if (cellBottom > nextTop + viewHeight) {
      nextTop = cellBottom - viewHeight
    }

    if (cellLeft < nextLeft) {
      nextLeft = cellLeft
    } else if (cellRight > nextLeft + viewWidth) {
      nextLeft = cellRight - viewWidth
    }

    if (nextTop !== scroller.scrollTop) {
      scroller.scrollTop = nextTop
      this.scrollTop = nextTop
    }
    if (nextLeft !== scroller.scrollLeft) {
      scroller.scrollLeft = nextLeft
      this.scrollLeft = nextLeft
    }
  }
}

function createIndexArray(count: number): number[] {
  const safeCount = Math.max(0, count | 0)
  return Array.from({ length: safeCount }, (_, idx) => idx)
}
