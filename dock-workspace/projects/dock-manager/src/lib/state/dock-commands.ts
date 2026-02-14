import { Injectable } from '@angular/core';
import { DockStore } from './dock-store';
import {
  reduceClosePane,
  findGroupIdForPane,
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

  maximizePane(paneId: string): void {
    const layout = this.store.layout();
    if (!layout.panesById[paneId]) {
      return;
    }

    if (this.store.maximizedPaneId() === paneId) {
      return;
    }

    if (!this.store.maximizedPaneId()) {
      this.store.setPreMaxLayout(structuredClone(layout));
    }

    this.store.setMaximizedPaneId(paneId);
  }

  exitMaximizeRestore(): void {
    if (!this.store.maximizedPaneId()) {
      return;
    }

    const snapshot = this.store.preMaxLayout();
    if (snapshot) {
      this.store.setLayout(snapshot);
    }

    this.store.setMaximizedPaneId(null);
    this.store.setPreMaxLayout(null);
  }

  exitMaximizeClose(): void {
    const paneId = this.store.maximizedPaneId();
    if (!paneId) {
      return;
    }

    const snapshot = this.store.preMaxLayout();
    if (!snapshot) {
      this.store.setMaximizedPaneId(null);
      return;
    }

    const groupId = findGroupIdForPane(snapshot, paneId);
    if (!groupId) {
      this.store.setLayout(snapshot);
      this.store.setMaximizedPaneId(null);
      this.store.setPreMaxLayout(null);
      return;
    }

    const nextLayout = reduceClosePane(snapshot, groupId, paneId);
    this.store.setLayout(nextLayout);
    this.store.setMaximizedPaneId(null);
    this.store.setPreMaxLayout(null);
  }
}
