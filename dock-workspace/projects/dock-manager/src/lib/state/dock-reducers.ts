import { DockLayout } from '../model/dock-layout';
import { LayoutNode } from '../model/layout-node';
import { TabGroupNode } from '../model/tab-group-node';

declare const ngDevMode: boolean;

export const DOCK_ROOT_SENTINEL_ID = '__dock_root__';
//const DOCK_EMPTY_SENTINEL_ID = '__dock_empty__';
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

  assertValidTabGroup(result.node);

  return {
    ...layout,
    root: result.node
  };
}

export function reduceClosePane(
  layout: DockLayout,
  groupId: string,
  paneId: string
): DockLayout {
  const result = closePane(layout.root, groupId, paneId);

  if (!result.changed) {
    return layout;
  }

  const normalizedRoot = normalizeRoot(result.node);
  assertValidTabGroup(normalizedRoot);

  return {
    ...layout,
    root: normalizedRoot
  };
}

export function reduceReorderPaneWithinGroup(
  layout: DockLayout,
  groupId: string,
  fromIndex: number,
  toIndex: number
): DockLayout {
  const result = reorderPaneWithinGroup(layout.root, groupId, fromIndex, toIndex);
  if (!result.changed) {
    return layout;
  }

  const normalizedRoot = normalizeRoot(result.node);
  assertValidTabGroup(normalizedRoot);
  return { 
    ...layout, 
    root: normalizedRoot 
  };
}

export function reduceMovePaneBetweenGroups(
  layout: DockLayout,
  paneId: string,
  fromGroupId: string,
  toGroupId: string,
  toIndex: number
): DockLayout {
  if (fromGroupId === toGroupId) {
    return layout;
  }

  const sourceGroup = findTabGroup(layout.root, fromGroupId);
  if (!sourceGroup) {
    return layout;
  }

  const sourceIndex = sourceGroup.paneIds.indexOf(paneId);
  if (sourceIndex === -1) {
    return layout;
  }

  const destGroup = findTabGroup(layout.root, toGroupId);
  if (!destGroup) {
    return layout;
  }

    if (destGroup.paneIds.includes(paneId)) {
    return layout;
  }

  const sourceUpdate = removePaneFromGroup(sourceGroup, sourceIndex, paneId);
  const destUpdate = insertPaneIntoGroup(destGroup, paneId, toIndex);

  const result = updateGroups(layout.root, {
    fromGroupId,
    toGroupId,
    sourcePaneIds: sourceUpdate.paneIds,
    sourceActivePaneId: sourceUpdate.activePaneId,
    destPaneIds: destUpdate.paneIds,
    destActivePaneId: paneId
  });

  if (!result.changed) {
    return layout;
  }

  const normalizedRoot = normalizeRoot(result.node);
  assertValidTabGroup(normalizedRoot);
  return {
    ...layout,
    root: normalizedRoot
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

function closePane(node: LayoutNode, groupId: string, paneId: string): UpdateResult {
  if (node.type === 'tab-group') {
    if (node.id !== groupId) {
      return { node, changed: false };
    }

    const paneIndex = node.paneIds.indexOf(paneId);
    if (paneIndex === -1) {
      return { node, changed: false };
    }

    const nextPaneIds = node.paneIds.filter((id) => id !== paneId);
    let nextActivePaneId = node.activePaneId;

    if (node.activePaneId === paneId) {
      if (nextPaneIds.length === 0) {
        nextActivePaneId = '';
      } else if (nextPaneIds[paneIndex - 1]) {
        nextActivePaneId = nextPaneIds[paneIndex - 1];
      } else if (nextPaneIds[paneIndex]) {
        nextActivePaneId = nextPaneIds[paneIndex];
      }
    }

    return {
      node: {
        ...node,
        paneIds: nextPaneIds,
        activePaneId: nextActivePaneId
      },
      changed: true
    };
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const result = closePane(child, groupId, paneId);
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

function reorderPaneWithinGroup(
  node: LayoutNode,
  groupId: string,
  fromIndex: number,
  toIndex: number
): UpdateResult {
  if (node.type === 'tab-group') {
    if (node.id !== groupId) {
      return { node, changed: false };
    }

    if (fromIndex === toIndex) {
      return { node, changed: false };
    }

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= node.paneIds.length ||
      toIndex >= node.paneIds.length
    ) {
      return { node, changed: false };
    }

    const paneId = node.paneIds[fromIndex];
    if (!paneId) {
      return { node, changed: false };
    }

    const without = node.paneIds.filter((_, index) => index !== fromIndex);
    const nextPaneIds = [
      ...without.slice(0, toIndex),
      paneId,
      ...without.slice(toIndex)
    ];

    return {
      node: {
        ...node,
        paneIds: nextPaneIds
      },
      changed: true
    };
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const result = reorderPaneWithinGroup(child, groupId, fromIndex, toIndex);
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

function findTabGroup(node: LayoutNode, groupId: string): TabGroupNode | null {
  if (node.type === 'tab-group') {
    return node.id === groupId ? node : null;
  }

  for (const child of node.children) {
    const result = findTabGroup(child, groupId);
    if (result) {
      return result;
    }
  }

  return null;
}

function removePaneFromGroup(
  group: TabGroupNode,
  paneIndex: number,
  paneId: string
): { paneIds: string[]; activePaneId: string } {
  const nextPaneIds = group.paneIds.filter((id) => id !== paneId);

  if (group.activePaneId !== paneId) {
    return {
      paneIds: nextPaneIds,
      activePaneId: group.activePaneId
    };
  }

  const leftNeighbor = group.paneIds[paneIndex - 1];
  if (leftNeighbor) {
    return {
      paneIds: nextPaneIds,
      activePaneId: leftNeighbor
    };
  }

  const rightNeighbor = group.paneIds[paneIndex + 1];
  if (rightNeighbor) {
    return {
      paneIds: nextPaneIds,
      activePaneId: rightNeighbor
    };
  }

  return {
    paneIds: nextPaneIds,
    activePaneId: ''
  };
}

function insertPaneIntoGroup(
  group: TabGroupNode,
  paneId: string,
  toIndex: number
): { paneIds: string[] } {
  const clampedIndex = Math.max(0, Math.min(toIndex, group.paneIds.length));
  const nextPaneIds = [
    ...group.paneIds.slice(0, clampedIndex),
    paneId,
    ...group.paneIds.slice(clampedIndex)
  ];

  return { paneIds: nextPaneIds };
}

function updateGroups(
  node: LayoutNode,
  update: {
    fromGroupId: string;
    toGroupId: string;
    sourcePaneIds: string[];
    sourceActivePaneId: string;
    destPaneIds: string[];
    destActivePaneId: string;
  }
): UpdateResult {
  if (node.type === 'tab-group') {
    if (node.id === update.fromGroupId) {
      return {
        node: {
          ...node,
          paneIds: update.sourcePaneIds,
          activePaneId: update.sourceActivePaneId
        },
        changed: true
      };
    }

    if (node.id === update.toGroupId) {
      return {
        node: {
          ...node,
          paneIds: update.destPaneIds,
          activePaneId: update.destActivePaneId
        },
        changed: true
      };
    }

    return { node, changed: false };
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const result = updateGroups(child, update);
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

function normalizeRoot(node: LayoutNode): LayoutNode {
  const normalized = normalizeNode(node, true);
  return normalized ?? createRootSentinelTabGroup();
}

function normalizeNode(node: LayoutNode, isRoot: boolean): LayoutNode | null {
  if (node.type === 'tab-group') {
    if (node.paneIds.length === 0 && !isRoot) {
      return null;
    }
    return node;
  }

  const normalizedChildren: LayoutNode[] = [];
  const normalizedSizes: number[] = [];
  let anyChange = false;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const normalizedChild = normalizeNode(child, false);

    if (normalizedChild === null) {
      anyChange = true;
      continue;
    }

    normalizedChildren.push(normalizedChild);

    const size = node.sizes?.[i];
    normalizedSizes.push(typeof size === 'number' ? size : 0);

    if (normalizedChild !== child) {
      anyChange = true;
    }
  }

  if (normalizedChildren.length === 0) {
    return isRoot ? createRootSentinelTabGroup() : null;
  }

  if (normalizedChildren.length === 1) {
    return normalizedChildren[0];
  }

  if (!anyChange) {
    return node;
  }
  // 1️⃣ Basic structural validation
  const sizesAreStructurallyValid =
    normalizedSizes.length === normalizedChildren.length &&
    normalizedSizes.every((s) => typeof s === 'number' && s > 0);

  // 2️⃣ Check whether sizes actually fill the split
  const sum = normalizedSizes.reduce((a, b) => a + b, 0);
  const sumIsReasonable = Math.abs(sum - 100) < 0.01;

  // 3️⃣ Detect whether children were pruned
  const childrenCountChanged = normalizedChildren.length !== node.children.length;

  // 4️⃣ Final decision: keep sizes or rebalance
  const finalSizes =
    sizesAreStructurallyValid && sumIsReasonable && !childrenCountChanged
      ? normalizedSizes
      : Array.from(
          { length: normalizedChildren.length },
          () => 100 / normalizedChildren.length
        );

  return {
    ...node,
    children: normalizedChildren,
    sizes: finalSizes
  };
}

function createRootSentinelTabGroup(): TabGroupNode {
  return {
    type: 'tab-group',
    id: DOCK_ROOT_SENTINEL_ID,
    paneIds: [],
    activePaneId: ''
  };
}

function assertValidTabGroup(node: LayoutNode): void {
  if (!ngDevMode) return;

  if (node.type === 'tab-group') {
    const ids = node.paneIds;
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      // eslint-disable-next-line no-console
      console.warn('[dock-manager] duplicate paneIds in tab group', node.id, ids);
    }

    const active = node.activePaneId;
    const isEmptyActive = active === '';
    const isValidActive = isEmptyActive || ids.includes(active);

    if (!isValidActive) {
      // eslint-disable-next-line no-console
      console.warn(
        '[dock-manager] activePaneId not in paneIds',
        node.id,
        { activePaneId: active, paneIds: ids }
      );
    }

    return;
  }

  // split node: recurse
  for (const child of node.children) {
    assertValidTabGroup(child);
  }
}
