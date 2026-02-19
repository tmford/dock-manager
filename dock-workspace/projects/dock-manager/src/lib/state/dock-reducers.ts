import { DockLayout } from '../model/dock-layout';
import { LayoutNode } from '../model/layout-node';
import { TabGroupNode } from '../model/tab-group-node';

declare const ngDevMode: boolean;

export const DOCK_ROOT_SENTINEL_ID = '__dock_root__';
//const DOCK_EMPTY_SENTINEL_ID = '__dock_empty__';
const MIN_SPLIT_PERCENT = 5;
const EPSILON = 0.0001;
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

export function reduceRestorePaneToGroup(
  layout: DockLayout,
  groupId: string,
  paneId: string,
  options?: { index?: number; activate?: boolean }
): DockLayout {
  if (!layout.panesById[paneId]) {
    return layout;
  }

  if (findGroupIdForPane(layout, paneId)) {
    return layout;
  }

  const result = restorePaneToGroup(layout.root, groupId, paneId, options);
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

export function reduceResizeSplit(
  layout: DockLayout,
  splitId: string,
  sizes: number[]
): DockLayout {
  const result = resizeSplit(layout.root, splitId, sizes);
  if (!result.changed) {
    return layout;
  }

  return {
    ...layout,
    root: result.node
  };
}

export function findGroupIdForPane(layout: DockLayout, paneId: string): string | null {
  return findGroupIdByPane(layout.root, paneId);
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

function resizeSplit(node: LayoutNode, splitId: string, sizes: number[]): UpdateResult {
  if (node.type === 'split') {
    if (node.id === splitId) {
      const nextSizes = normalizeSplitSizes(node.children.length, sizes);
      if (!nextSizes) {
        return { node, changed: false };
      }

      if (areSizesEqual(node.sizes, nextSizes)) {
        return { node, changed: false };
      }

      return {
        node: {
          ...node,
          sizes: nextSizes
        },
        changed: true
      };
    }

    let changed = false;
    const nextChildren = node.children.map((child) => {
      const result = resizeSplit(child, splitId, sizes);
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

  return { node, changed: false };
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

function restorePaneToGroup(
  node: LayoutNode,
  groupId: string,
  paneId: string,
  options?: { index?: number; activate?: boolean }
): UpdateResult {
  if (node.type === 'tab-group') {
    if (node.id !== groupId) {
      return { node, changed: false };
    }

    if (node.paneIds.includes(paneId)) {
      return { node, changed: false };
    }

    const targetIndex =
      typeof options?.index === 'number' && Number.isFinite(options.index)
        ? Math.trunc(options.index)
        : node.paneIds.length;
    const nextPaneIds = insertPaneIntoGroup(node, paneId, targetIndex).paneIds;

    return {
      node: {
        ...node,
        paneIds: nextPaneIds,
        activePaneId: options?.activate === false ? node.activePaneId : paneId
      },
      changed: true
    };
  }

  if (node.type !== 'split') {
    return { node, changed: false };
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const result = restorePaneToGroup(child, groupId, paneId, options);
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

function normalizeSplitSizes(childrenCount: number, sizes: number[]): number[] | null {
  if (sizes.length !== childrenCount) {
    return null;
  }

  if (!sizes.every((size) => Number.isFinite(size) && size > 0)) {
    return null;
  }

  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const normalized = sizes.map((size) => (size / total) * 100);
  const enforced = enforceMinSplitSizes(normalized);
  if (!enforced) {
    return null;
  }

  const sum = enforced.reduce((sumSizes, size) => sumSizes + size, 0);
  const delta = 100 - sum;
  const lastIndex = enforced.length - 1;
  enforced[lastIndex] = enforced[lastIndex] + delta;

  // Guard rail: ensure final element did not drift below minimum
  if (
    !Number.isFinite(enforced[lastIndex]) ||
    enforced[lastIndex] < MIN_SPLIT_PERCENT - EPSILON
  ) {
      return null;
  }

  return enforced;
}

function enforceMinSplitSizes(sizes: number[]): number[] | null {
  const result = sizes.slice();
  const fixed = new Set<number>();

  for (let i = 0; i < result.length; i++) {
    if (result[i] < MIN_SPLIT_PERCENT) {
      result[i] = MIN_SPLIT_PERCENT;
      fixed.add(i);
    }
  }

  while (true) {
    const remaining = 100 - fixed.size * MIN_SPLIT_PERCENT;
    if (remaining < -EPSILON) {
      return null;
    }

    const adjustable: number[] = [];
    for (let i = 0; i < result.length; i++) {
      if (!fixed.has(i)) {
        adjustable.push(i);
      }
    }

    if (adjustable.length === 0) {
      if (Math.abs(remaining) > EPSILON) {
        return null;
      }
      return result;
    }

    const adjustableTotal = adjustable.reduce((sum, index) => sum + result[index], 0);
    if (!Number.isFinite(adjustableTotal) || adjustableTotal <= 0) {
      return null;
    }

    const scale = remaining / adjustableTotal;
    let changed = false;
    for (const index of adjustable) {
      result[index] = result[index] * scale;
    }

    for (const index of adjustable) {
      if (result[index] < MIN_SPLIT_PERCENT - EPSILON) {
        result[index] = MIN_SPLIT_PERCENT;
        fixed.add(index);
        changed = true;
      }
    }

    if (!changed) {
      return result;
    }
  }
}

function areSizesEqual(existing: number[] | undefined, next: number[]): boolean {
  if (!existing || existing.length !== next.length) {
    return false;
  }

  for (let i = 0; i < next.length; i++) {
    if (Math.abs(existing[i] - next[i]) >= EPSILON) {
      return false;
    }
  }

  return true;
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

function findGroupIdByPane(node: LayoutNode, paneId: string): string | null {
  if (node.type === 'tab-group') {
    return node.paneIds.includes(paneId) ? node.id : null;
  }

  for (const child of node.children) {
    const result = findGroupIdByPane(child, paneId);
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
