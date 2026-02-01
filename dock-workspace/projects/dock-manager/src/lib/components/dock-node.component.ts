import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LayoutNode } from '../model/layout-node';
import { DockStore } from '../state/dock-store';
import { DockSplitComponent } from './dock-split.component';
import { DockTabsComponent } from './dock-tabs.component';

@Component({
  selector: 'dock-node',
  standalone: true,
  imports: [DockSplitComponent, DockTabsComponent],
  template: `
    @switch (node.type) {
      @case ('split') {
        <dock-split [node]="node" [store]="store"></dock-split>
      }
      @case ('tab-group') {
        <dock-tabs [node]="node" [store]="store"></dock-tabs>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockNodeComponent {
  @Input({ required: true }) node!: LayoutNode;
  @Input({ required: true }) store!: DockStore;
}
