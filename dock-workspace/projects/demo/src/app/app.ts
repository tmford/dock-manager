import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DockLayout, DockRootComponent, DockStore } from 'dock-manager';

const initialLayout: DockLayout = {
  root: {
    type: 'split',
    id: 'root-split',
    direction: 'horizontal',
    sizes: [30, 70],
    children: [
      // LEFT: make it a vertical split to add nesting on the left too
      {
        type: 'split',
        id: 'left-split',
        direction: 'vertical',
        sizes: [55, 45],
        children: [
          {
            type: 'tab-group',
            id: 'left-top-group',
            paneIds: ['pane-1', 'pane-2'],
            activePaneId: 'pane-1'
          },
          {
            type: 'tab-group',
            id: 'left-bottom-group',
            paneIds: ['pane-6', 'pane-7'],
            activePaneId: 'pane-6'
          }
        ]
      },

      // RIGHT: vertical split, but each half nests again
      {
        type: 'split',
        id: 'right-split',
        direction: 'vertical',
        sizes: [60, 40],
        children: [
          // RIGHT-TOP becomes a horizontal split (nest level 2)
          {
            type: 'split',
            id: 'right-top-split',
            direction: 'horizontal',
            sizes: [55, 45],
            children: [
              {
                type: 'tab-group',
                id: 'right-top-left-group',
                paneIds: ['pane-3', 'pane-4', 'pane-8', 'pane-9'],
                activePaneId: 'pane-3'
              },

              // RIGHT-TOP-RIGHT becomes another vertical split (nest level 3)
              {
                type: 'split',
                id: 'right-top-right-split',
                direction: 'vertical',
                sizes: [50, 50],
                children: [
                  {
                    type: 'tab-group',
                    id: 'right-top-right-top-group',
                    paneIds: ['pane-10', 'pane-11', 'pane-12'],
                    activePaneId: 'pane-10'
                  },
                  {
                    type: 'tab-group',
                    id: 'right-top-right-bottom-group',
                    paneIds: ['pane-13', 'pane-14', 'pane-15'],
                    activePaneId: 'pane-13'
                  }
                ]
              }
            ]
          },

          // RIGHT-BOTTOM: keep a tab group for simple baseline testing
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
    'pane-5': { id: 'pane-5', title: 'Preview', componentKey: 'preview' },

    'pane-6': { id: 'pane-6', title: 'six', componentKey: 'six' },
    'pane-7': { id: 'pane-7', title: 'seven', componentKey: 'seven' },
    'pane-8': { id: 'pane-8', title: 'eight', componentKey: 'eight' },
    'pane-9': { id: 'pane-9', title: 'nine', componentKey: 'nine' },
    'pane-10': { id: 'pane-10', title: 'ten', componentKey: 'ten' },

    // FIXED: ids now match keys
    'pane-11': { id: 'pane-11', title: 'does', componentKey: 'six' },
    'pane-12': { id: 'pane-12', title: 'not', componentKey: 'seven' },
    'pane-13': { id: 'pane-13', title: 'matter', componentKey: 'eight' },
    'pane-14': { id: 'pane-14', title: 'what the tab titles', componentKey: 'nine' },
    'pane-15': { id: 'pane-15', title: 'are', componentKey: 'ten' }
  }
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DockRootComponent],
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
