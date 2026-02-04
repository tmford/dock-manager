import { DockLayout } from '../model/dock-layout';
import { LayoutNode } from '../model/layout-node';

interface UpdateResult {
  node: LayoutNode;
  changed: boolean;
}

export function reduceSetActivePane(
  layout: DockLayout,
  groupId: string,
  paneId: string
): DockLayout {
  const result = updateActivePane(layout.root, groupId, paneId);
  if (!result.changed) {
    return layout;
  }

  return {
    ...layout,
    root: result.node
  };
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
