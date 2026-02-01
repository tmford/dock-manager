import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TabGroupNode } from '../model/tab-group-node';
import { DockStore } from '../state/dock-store';
import { DockPaneHostComponent } from './dock-pane-host.component';

@Component({
  selector: 'dock-tabs',
  standalone: true,
  imports: [DockPaneHostComponent],
  template: `
    @let panes = store.layout().panesById;
    @let activePane = panes[node.activePaneId];

    <div class="dock-tabs">
      <div class="tab-strip">
        @for (paneId of node.paneIds; track paneId) {
          @let pane = panes[paneId];
          <button
            type="button"
            class="tab"
            [class.active]="paneId === node.activePaneId"
            (click)="activate(paneId)"
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
  `,
  styles: [
    `
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
export class DockTabsComponent {
  @Input({ required: true }) node!: TabGroupNode;
  @Input({ required: true }) store!: DockStore;

  activate(paneId: string): void {
    this.store.setActivePane(this.node.id, paneId);
  }
}
