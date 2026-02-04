import { Injectable, signal } from '@angular/core';
import { DockLayout } from '../model/dock-layout';

// 1. Define a "Safe Mode" layout constant
const EMPTY_LAYOUT: DockLayout = {
  root: {
    type: 'tab-group',
    id: 'empty',
    paneIds: [],
    activePaneId: ''
  },
  panesById: {}
};

@Injectable({ providedIn: 'root' })
export class DockStore {
  // 2. Initialize Signal with the safe constant
  private readonly _layout = signal<DockLayout>(EMPTY_LAYOUT);
  
  // 3. Expose Read-Only Signal
  readonly layout = this._layout.asReadonly();

  // 4. The ONLY way to update state (Atomic updates)
  setLayout(layout: DockLayout): void {
    this._layout.set(layout);
  }
}
