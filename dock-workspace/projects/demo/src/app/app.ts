import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DockLayout, DockRendererComponent, DockStore } from 'dock-manager';

const initialLayout: DockLayout = {
  root: {
    type: 'split',
    id: 'root-split',
    direction: 'horizontal',
    sizes: [45, 55],
    children: [
      {
        type: 'tab-group',
        id: 'left-group',
        paneIds: ['pane-1', 'pane-2'],
        activePaneId: 'pane-1'
      },
      {
        type: 'split',
        id: 'right-split',
        direction: 'vertical',
        sizes: [60, 40],
        children: [
          {
            type: 'tab-group',
            id: 'right-top-group',
            paneIds: ['pane-3', 'pane-4'],
            activePaneId: 'pane-3'
          },
          {
            type: 'tab-group',
            id: 'right-bottom-group',
            paneIds: ['pane-5'],
            activePaneId: 'pane-5'
          }
        ]
      }
    ]
  },
  panesById: {
    'pane-1': { id: 'pane-1', title: 'Scene', componentKey: 'scene' },
    'pane-2': { id: 'pane-2', title: 'Hierarchy', componentKey: 'hierarchy' },
    'pane-3': { id: 'pane-3', title: 'Inspector', componentKey: 'inspector' },
    'pane-4': { id: 'pane-4', title: 'Console', componentKey: 'console' },
    'pane-5': { id: 'pane-5', title: 'Preview', componentKey: 'preview' }
  }
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DockRendererComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  readonly dockStore = inject(DockStore);

  constructor() {
    this.dockStore.setLayout(initialLayout);
  }
}
