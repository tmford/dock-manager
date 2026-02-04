import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { LayoutNode } from '../model/layout-node';
import { SplitNode } from '../model/split-node';
import { TabGroupNode } from '../model/tab-group-node';
import { DockCommands } from '../state/dock-commands';
import { DockStore } from '../state/dock-store';
import { DockPaneHostComponent } from './dock-pane-host.component';

@Component({
  selector: 'dock-renderer',
  standalone: true,
  imports: [DockPaneHostComponent, NgTemplateOutlet],
  template: `
    <ng-template #rendererTpl let-node>
      @switch (node.type) {
        @case ('split') {
          @let split = splitNode(node);
          <div
            class="dock-split"
            [class.horizontal]="split.direction === 'horizontal'"
            [class.vertical]="split.direction === 'vertical'"
          >
            @for (child of split.children; track child.id; let index = $index) {
              <div class="split-child" [style.flex]="childFlex(split, index)">
                <ng-container
                  [ngTemplateOutlet]="rendererTpl"
                  [ngTemplateOutletContext]="{ $implicit: child }"
                ></ng-container>
              </div>
            }
          </div>
        }
        @case ('tab-group') {
          @let group = tabGroup(node);
          @let panes = store.layout().panesById;
          @let activePane = panes[group.activePaneId];

          <div class="dock-tabs">
            <div class="tab-strip">
              @for (paneId of group.paneIds; track paneId) {
                @let pane = panes[paneId];
                <button
                  type="button"
                  class="tab"
                  [class.active]="paneId === group.activePaneId"
                  (click)="activate(group.id, paneId)"
                >
                  {{ pane?.title || paneId }}
                </button>
              }
            </div>
            <div class="tab-body">
              @if (activePane) {
                <dock-pane-host [pane]="activePane"></dock-pane-host>
              } @else {
                <div class="empty">No active pane</div>
              }
            </div>
          </div>
        }
      }
    </ng-template>

    <ng-container
      [ngTemplateOutlet]="rendererTpl"
      [ngTemplateOutletContext]="{ $implicit: node }"
    ></ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

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

      .dock-tabs {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        border: 1px solid #334155;
        background: #0b1120;
      }

      .tab-strip {
        display: flex;
        gap: 0.25rem;
        padding: 0.35rem 0.5rem;
        background: #111827;
        border-bottom: 1px solid #1f2937;
      }

      .tab {
        border: 1px solid transparent;
        background: #0f172a;
        color: #cbd5f5;
        padding: 0.3rem 0.6rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
      }

      .tab.active {
        border-color: #38bdf8;
        color: #e0f2fe;
        background: #0b2a42;
      }

      .tab-body {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }

      .empty {
        padding: 0.75rem;
        color: #94a3b8;
        font-size: 0.85rem;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockRendererComponent {
  @Input({ required: true }) node!: LayoutNode;
  @Input({ required: true }) store!: DockStore;
  private readonly commands = inject(DockCommands);

  splitNode(node: LayoutNode): SplitNode {
    if (node.type !== 'split') {
      throw new Error(`dock-renderer received node.type=${node.type}`);
    }

    return node as SplitNode;
  }

  tabGroup(node: LayoutNode): TabGroupNode {
    if (node.type !== 'tab-group') {
      throw new Error(`dock-renderer received node.type=${node.type}`);
    }

    return node as TabGroupNode;
  }

  childFlex(split: SplitNode, index: number): string {
    const size = split.sizes?.[index];
    if (typeof size === 'number' && size > 0) {
      return `0 0 ${size}%`;
    }

    return '1 1 0';
  }

  activate(groupId: string, paneId: string): void {
    this.commands.setActivePane(groupId, paneId);
  }
}
