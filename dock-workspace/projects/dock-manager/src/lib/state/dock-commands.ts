import { Injectable } from '@angular/core';
import { DockStore } from './dock-store';
import {
  reduceClosePane,
  reduceMovePaneBetweenGroups,
  reduceResizeSplit,
  reduceReorderPaneWithinGroup,
  reduceSetActivePane
} from './dock-reducers';

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

  closePane(groupId: string, paneId: string): void {
    const layout = this.store.layout();
    const nextLayout = reduceClosePane(layout, groupId, paneId);
    if (nextLayout === layout) {
      return;
    }

    this.store.setLayout(nextLayout);
  }

  reorderPaneWithinGroup(groupId: string, fromIndex: number, toIndex: number): void {
    const layout = this.store.layout();
    const nextLayout = reduceReorderPaneWithinGroup(layout, groupId, fromIndex, toIndex);
    if (nextLayout === layout) {
      return;
    }

    this.store.setLayout(nextLayout);
  }

  movePaneBetweenGroups(
    paneId: string,
    fromGroupId: string,
    toGroupId: string,
    toIndex: number
  ): void {
    const layout = this.store.layout();
    const nextLayout = reduceMovePaneBetweenGroups(
      layout,
      paneId,
      fromGroupId,
      toGroupId,
      toIndex
    );
    if (nextLayout === layout) {
      return;
    }

    this.store.setLayout(nextLayout);
  }

  resizeSplit(splitId: string, sizes: number[]): void {
    const layout = this.store.layout();
    const nextLayout = reduceResizeSplit(layout, splitId, sizes);
    if (nextLayout === layout) {
      return;
    }

    this.store.setLayout(nextLayout);
  }
}
