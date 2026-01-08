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
        [attr.aria-rowcount]="rows"
        [attr.aria-colcount]="cols"
        [attr.aria-multiselectable]="vm.selectionRange ? 'true' : 'false'"
        [attr.aria-activedescendant]="activeDescendantId()"
        [style.table-layout]="virtualization ? 'fixed' : null"
      >
        <tbody>
          <tr *ngIf="virtualization && topOffset > 0" role="presentation">
            <td
              class="spacer"
              role="presentation"
              aria-hidden="true"
              [attr.colspan]="columnSlots"
              [style.height.px]="topOffset"
            ></td>
          </tr>
          <tr
            *ngFor="let r of rowIndexes; trackBy: trackRow"
            role="row"
            [attr.aria-rowindex]="r + 1"
            [style.height.px]="virtualization?.rowHeight"
          >
            <td
              *ngIf="virtualization && leftOffset > 0"
              class="spacer"
              role="presentation"
              aria-hidden="true"
              [style.width.px]="leftOffset"
            ></td>
            <td
              *ngFor="let c of colIndexes; trackBy: trackCol"
              [attr.data-focused]="isFocused(r, c) ? '' : null"
              [attr.data-selected]="isSelected(r, c) ? '' : null"
              [attr.data-editing]="isEditing(r, c) ? '' : null"
              role="gridcell"
              [attr.aria-colindex]="c + 1"
              [attr.aria-selected]="isSelected(r, c) ? 'true' : 'false'"
              [attr.id]="cellId(r, c)"
              [style.width.px]="virtualization?.colWidth"
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
            <td
              *ngIf="virtualization && rightOffset > 0"
              class="spacer"
              role="presentation"
              aria-hidden="true"
              [style.width.px]="rightOffset"
            ></td>
          </tr>
          <tr *ngIf="virtualization && bottomOffset > 0" role="presentation">
            <td
              class="spacer"
              role="presentation"
              aria-hidden="true"
              [attr.colspan]="columnSlots"
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
    colWidth: number
    width: number
    height: number
    overscan?: number
  }

  vm: GridViewModel = {
    focus: null,
    selection: { anchor: null, rangeEnd: null },
    selectionRange: null,
    edit: { status: "idle", cell: null },
    columns: []
  }
  rowIndexes: number[] = []
  colIndexes: number[] = []
  readonly idPrefix = `busted-grid-${Math.random()
    .toString(36)
    .slice(2)}`
  @ViewChild("scroller") scroller?: ElementRef<HTMLDivElement>
  rowStart = 0
  rowEnd = -1
  colStart = 0
  colEnd = -1
  leftOffset = 0
  rightOffset = 0
  topOffset = 0
  bottomOffset = 0
  columnSlots = 0
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
      colWidth: this.virtualization.colWidth,
      viewportHeight: this.virtualization.height,
      viewportWidth: this.virtualization.width,
      scrollTop: this.scrollTop,
      scrollLeft: this.scrollLeft,
      overscan: this.virtualization.overscan
    }
  }

  private updateVirtualization(): void {
    if (!this.virtualization || !this.vm.viewport) {
      this.rowIndexes = createIndexArray(this.rows)
      this.colIndexes = createIndexArray(this.cols)
      this.rowStart = 0
      this.rowEnd = this.rows - 1
      this.colStart = 0
      this.colEnd = this.cols - 1
      this.leftOffset = 0
      this.rightOffset = 0
      this.topOffset = 0
      this.bottomOffset = 0
      this.columnSlots = this.cols
      return
    }

    const rowRange = this.vm.viewport.rowRange
    const colRange = this.vm.viewport.colRange
    this.rowStart = Math.max(0, rowRange.start)
    this.rowEnd = Math.min(this.rows - 1, rowRange.end)
    this.colStart = Math.max(0, colRange.start)
    this.colEnd = Math.min(this.cols - 1, colRange.end)

    if (this.rowEnd < this.rowStart || this.colEnd < this.colStart) {
      this.rowIndexes = []
      this.colIndexes = []
      this.leftOffset = 0
      this.rightOffset = 0
      this.topOffset = 0
      this.bottomOffset = 0
      this.columnSlots = 1
      return
    }

    this.rowIndexes = createIndexArray(this.rowEnd - this.rowStart + 1).map(
      idx => this.rowStart + idx
    )
    this.colIndexes = createIndexArray(this.colEnd - this.colStart + 1).map(
      idx => this.colStart + idx
    )
    this.leftOffset = this.colStart * this.virtualization.colWidth
    this.rightOffset =
      Math.max(0, this.cols - this.colEnd - 1) *
      this.virtualization.colWidth
    this.topOffset = this.rowStart * this.virtualization.rowHeight
    this.bottomOffset =
      Math.max(0, this.rows - this.rowEnd - 1) *
      this.virtualization.rowHeight
    const visibleCols = this.colEnd - this.colStart + 1
    this.columnSlots =
      (visibleCols > 0 ? visibleCols : 1) +
      (this.leftOffset > 0 ? 1 : 0) +
      (this.rightOffset > 0 ? 1 : 0)
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
    const cellLeft = focus.col * this.virtualization.colWidth
    const cellRight = cellLeft + this.virtualization.colWidth
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
