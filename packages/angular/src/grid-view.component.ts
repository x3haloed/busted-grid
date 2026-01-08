import { CommonModule } from "@angular/common"
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef
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
    `
  ],
  template: `
    <table tabindex="0">
      <tbody>
        <tr *ngFor="let r of rowIndexes; trackBy: trackRow">
          <td
            *ngFor="let c of colIndexes; trackBy: trackCol"
            [attr.data-focused]="isFocused(r, c) ? '' : null"
            [attr.data-selected]="isSelected(r, c) ? '' : null"
            (click)="selectCell(r, c)"
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
      </tbody>
    </table>
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

  vm: GridViewModel = {
    focus: null,
    selection: { anchor: null, rangeEnd: null },
    selectionRange: null,
    columns: []
  }
  rowIndexes: number[] = []
  colIndexes: number[] = []

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
    if (changes["runtime"] && !changes["runtime"].isFirstChange()) {
      this.attachRuntime()
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe()
  }

  selectCell(row: number, col: number): void {
    this.runtime?.dispatch({ type: "SELECT_CELL", cell: { row, col } })
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

  cellContext(row: number, col: number): GridCellTemplateContext {
    const cell = { row, col }
    return { $implicit: cell, cell }
  }

  private attachRuntime(): void {
    this.unsubscribe()
    if (!this.runtime) return

    this.vm = this.runtime.getViewModel()
    this.unsubscribeRuntime = this.runtime.subscribe(() => {
      this.vm = this.runtime.getViewModel()
      this.cdr.markForCheck()
    })
    this.cdr.markForCheck()
  }

  private unsubscribe(): void {
    this.unsubscribeRuntime?.()
    this.unsubscribeRuntime = undefined
  }
}

function createIndexArray(count: number): number[] {
  const safeCount = Math.max(0, count | 0)
  return Array.from({ length: safeCount }, (_, idx) => idx)
}
