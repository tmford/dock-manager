import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SplitNode } from '../model/split-node';
import { DockStore } from '../state/dock-store';
import { DockNodeComponent } from './dock-node.component';

@Component({
  selector: 'dock-split',
  standalone: true,
  imports: [DockNodeComponent],
  template: `
    <div class="dock-split" [class.horizontal]="node.direction === 'horizontal'" [class.vertical]="node.direction === 'vertical'">
      @for (child of node.children; track child.id; let index = $index) {
        <div class="split-child" [style.flex]="childFlex(index)">
          <dock-node [node]="child" [store]="store"></dock-node>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dock-split {
        display: flex;
        width: 100%;
        height: 100%;
        gap: 1px;
        background: #1e293b;
      }

      .dock-split.horizontal {
        flex-direction: row;
      }

      .dock-split.vertical {
        flex-direction: column;
      }

      .split-child {
        display: flex;
        min-width: 0;
        min-height: 0;
        background: #0f172a;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockSplitComponent {
  @Input({ required: true }) node!: SplitNode;
  @Input({ required: true }) store!: DockStore;

  childFlex(index: number): string {
    const size = this.node.sizes?.[index];
    if (typeof size === 'number' && size > 0) {
      return `0 0 ${size}%`;
    }

    return '1 1 0';
  }
}
