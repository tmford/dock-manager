import { signal } from '@angular/core';
import { DockLayout } from '../model/dock-layout';
import { LayoutNode } from '../model/layout-node';

interface UpdateResult {
  node: LayoutNode;
  changed: boolean;
}

const EMPTY_LAYOUT: DockLayout = {
  root: {
    type: 'tab-group',
    id: 'empty',
    paneIds: [],
    activePaneId: ''
  },
  panesById: {}
};

export class DockStore {
  private readonly _layout = signal<DockLayout>(EMPTY_LAYOUT);
  readonly layout = this._layout.asReadonly();

  constructor(initialLayout?: DockLayout) {
    if (initialLayout) {
      this._layout.set(initialLayout);
    }
  }

  setLayout(layout: DockLayout): void {
    this._layout.set(layout);
  }

  setActivePane(groupId: string, paneId: string): void {
    this._layout.update((layout) => {
      const result = updateActivePane(layout.root, groupId, paneId);
      if (!result.changed) {
        return layout;
      }

      return {
        ...layout,
        root: result.node
      };
    });
  }
}

function updateActivePane(node: LayoutNode, groupId: string, paneId: string): UpdateResult {
  if (node.type === 'tab-group') {
    if (node.id !== groupId) {
      return { node, changed: false };
    }

    if (!node.paneIds.includes(paneId) || node.activePaneId === paneId) {
      return { node, changed: false };
    }

    return {
      node: {
        ...node,
        activePaneId: paneId
      },
      changed: true
    };
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const result = updateActivePane(child, groupId, paneId);
    if (result.changed) {
      changed = true;
    }
    return result.node;
  });

  if (!changed) {
    return { node, changed: false };
  }

  return {
    node: {
      ...node,
      children: nextChildren
    },
    changed: true
  };
}
