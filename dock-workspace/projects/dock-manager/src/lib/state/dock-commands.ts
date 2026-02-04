import { Injectable } from '@angular/core';
import { DockStore } from './dock-store';
import { reduceSetActivePane } from './dock-reducers';

@Injectable({ providedIn: 'root' })
export class DockCommands {
  constructor(private readonly store: DockStore) {}

  setActivePane(groupId: string, paneId: string): void {
    const layout = this.store.layout();
    const nextLayout = reduceSetActivePane(layout, groupId, paneId);
    if (nextLayout === layout) {
      return;
    }

    this.store.setLayout(nextLayout);
  }
}
