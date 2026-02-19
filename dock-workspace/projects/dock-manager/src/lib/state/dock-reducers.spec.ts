import { DockLayout } from '../model/dock-layout';
import { LayoutNode } from '../model/layout-node';
import { SplitNode } from '../model/split-node';
import { TabGroupNode } from '../model/tab-group-node';
import {
  findGroupIdForPane,
  reduceClosePane,
  reduceMovePaneBetweenGroups,
  reduceResizeSplit,
  reduceRestorePaneToGroup,
  reduceReorderPaneWithinGroup,
  reduceSetActivePane
} from './dock-reducers';
import { DockCommands } from './dock-commands';
import { DockStore } from './dock-store';

describe('dock reducers', () => {
  const baseLayout: DockLayout = {
    root: {
      type: 'split',
      id: 'root',
      direction: 'horizontal',
      sizes: [50, 50],
      children: [
        {
          type: 'tab-group',
          id: 'left',
          paneIds: ['a', 'b'],
          activePaneId: 'a'
        },
        {
          type: 'tab-group',
          id: 'right',
          paneIds: ['c'],
          activePaneId: 'c'
        }
      ]
    },
    panesById: {
      a: { id: 'a', title: 'A', componentKey: 'a' },
      b: { id: 'b', title: 'B', componentKey: 'b' },
      c: { id: 'c', title: 'C', componentKey: 'c' }
    }
  };

  // ---------------------------------------------------------------------------
  // helpers (Option A: fail() + throw to make TS narrow unions)
  // ---------------------------------------------------------------------------
  function asSplit(node: LayoutNode): SplitNode {
    if (node.type !== 'split') {
      fail(`expected split node, got ${node.type}`);
      throw new Error('unreachable');
    }
    return node;
  }

  function asTabGroup(node: LayoutNode): TabGroupNode {
    if (node.type !== 'tab-group') {
      fail(`expected tab-group node, got ${node.type}`);
      throw new Error('unreachable');
    }
    return node;
  }

  function expectSizesSumTo100(sizes: number[], epsilon = 0.01) {
    const sum = sizes.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 100)).toBeLessThan(epsilon);
  }

  // ---------------------------------------------------------------------------
  // set active pane
  // ---------------------------------------------------------------------------
  it('sets active pane in existing group', () => {
    const next = reduceSetActivePane(baseLayout, 'left', 'b');

    expect(next).not.toBe(baseLayout);

    const root = asSplit(next.root);
    const left = asTabGroup(root.children[0]);
    expect(left.activePaneId).toBe('b');
  });

  it('no-ops when groupId is not found', () => {
    const next = reduceSetActivePane(baseLayout, 'missing', 'b');
    expect(next).toBe(baseLayout);
  });

  it('no-ops when paneId is not in that group', () => {
    const next = reduceSetActivePane(baseLayout, 'left', 'c');
    expect(next).toBe(baseLayout);
  });

  // ---------------------------------------------------------------------------
  // close pane
  // ---------------------------------------------------------------------------
  it('removes paneId from group', () => {
    const next = reduceClosePane(baseLayout, 'left', 'b');

    expect(next).not.toBe(baseLayout);

    const root = asSplit(next.root);
    const left = asTabGroup(root.children[0]);
    expect(left.paneIds).toEqual(['a']);
    expect(left.activePaneId).toBe('a');
  });

  it('no-ops when closing a missing group', () => {
    const next = reduceClosePane(baseLayout, 'missing', 'b');
    expect(next).toBe(baseLayout);
  });

  it('no-ops when closing a pane not in the group', () => {
    const next = reduceClosePane(baseLayout, 'left', 'c');
    expect(next).toBe(baseLayout);
  });

  it('keeps active pane when closing an inactive pane', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'group',
        paneIds: ['a', 'b', 'c'],
        activePaneId: 'b'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceClosePane(layout, 'group', 'a');

    expect(next).not.toBe(layout);

    const root = asTabGroup(next.root);
    expect(root.activePaneId).toBe('b');
    expect(root.paneIds).toEqual(['b', 'c']);
  });

  it('selects left neighbor when closing the active pane', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'group',
        paneIds: ['a', 'b', 'c'],
        activePaneId: 'b'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceClosePane(layout, 'group', 'b');

    const root = asTabGroup(next.root);
    expect(root.activePaneId).toBe('a');
    expect(root.paneIds).toEqual(['a', 'c']);
  });

  it('selects next pane when closing the first active pane', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'group',
        paneIds: ['a', 'b'],
        activePaneId: 'a'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' }
      }
    };

    const next = reduceClosePane(layout, 'group', 'a');

    const root = asTabGroup(next.root);
    expect(root.activePaneId).toBe('b');
    expect(root.paneIds).toEqual(['b']);
  });

  it('clears active pane when closing the last tab', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'group',
        paneIds: ['a'],
        activePaneId: 'a'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' }
      }
    };

    const next = reduceClosePane(layout, 'group', 'a');

    const root = asTabGroup(next.root);
    expect(root.paneIds).toEqual([]);
    expect(root.activePaneId).toBe('');
  });

  it('closes pane in a nested tab group', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [40, 60],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a'],
            activePaneId: 'a'
          },
          {
            type: 'split',
            id: 'right-split',
            direction: 'vertical',
            sizes: [70, 30],
            children: [
              {
                type: 'tab-group',
                id: 'right-top',
                paneIds: ['b', 'c'],
                activePaneId: 'c'
              },
              {
                type: 'tab-group',
                id: 'right-bottom',
                paneIds: ['d'],
                activePaneId: 'd'
              }
            ]
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' },
        d: { id: 'd', title: 'D', componentKey: 'd' }
      }
    };

    const next = reduceClosePane(layout, 'right-top', 'c');

    expect(next).not.toBe(layout);

    const root = asSplit(next.root);
    const right = asSplit(root.children[1]);
    const rightTop = asTabGroup(right.children[0]);

    expect(rightTop.paneIds).toEqual(['b']);
    expect(rightTop.activePaneId).toBe('b');
  });

  // ---------------------------------------------------------------------------
  // reorder within group
  // ---------------------------------------------------------------------------
  it('reorders panes within a group', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'group',
        paneIds: ['a', 'b', 'c'],
        activePaneId: 'b'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceReorderPaneWithinGroup(layout, 'group', 0, 2);

    expect(next).not.toBe(layout);

    const root = asTabGroup(next.root);
    expect(root.paneIds).toEqual(['b', 'c', 'a']);
    expect(root.activePaneId).toBe('b');
  });

  it('no-ops when reorder indices are the same', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'group',
        paneIds: ['a', 'b'],
        activePaneId: 'a'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' }
      }
    };

    const next = reduceReorderPaneWithinGroup(layout, 'group', 1, 1);
    expect(next).toBe(layout);
  });

  it('keeps active pane unchanged on reorder', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'group',
        paneIds: ['a', 'b', 'c'],
        activePaneId: 'c'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceReorderPaneWithinGroup(layout, 'group', 2, 0);

    const root = asTabGroup(next.root);
    expect(root.paneIds).toEqual(['c', 'a', 'b']);
    expect(root.activePaneId).toBe('c');
  });

  it('reorders in a nested tab group', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a'],
            activePaneId: 'a'
          },
          {
            type: 'split',
            id: 'right',
            direction: 'vertical',
            sizes: [60, 40],
            children: [
              {
                type: 'tab-group',
                id: 'right-top',
                paneIds: ['b', 'c', 'd'],
                activePaneId: 'c'
              },
              {
                type: 'tab-group',
                id: 'right-bottom',
                paneIds: ['e'],
                activePaneId: 'e'
              }
            ]
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' },
        d: { id: 'd', title: 'D', componentKey: 'd' },
        e: { id: 'e', title: 'E', componentKey: 'e' }
      }
    };

    const next = reduceReorderPaneWithinGroup(layout, 'right-top', 2, 0);

    expect(next).not.toBe(layout);

    const root = asSplit(next.root);
    const right = asSplit(root.children[1]);
    const rightTop = asTabGroup(right.children[0]);

    expect(rightTop.paneIds).toEqual(['d', 'b', 'c']);
    expect(rightTop.activePaneId).toBe('c');
  });

  // ---------------------------------------------------------------------------
  // move between groups
  // ---------------------------------------------------------------------------
  it('moves pane between groups and activates destination', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a', 'b'],
            activePaneId: 'a'
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['c'],
            activePaneId: 'c'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceMovePaneBetweenGroups(layout, 'b', 'left', 'right', 1);

    expect(next).not.toBe(layout);

    const root = asSplit(next.root);
    const left = asTabGroup(root.children[0]);
    const right = asTabGroup(root.children[1]);

    expect(left.paneIds).toEqual(['a']);
    expect(left.activePaneId).toBe('a');
    expect(right.paneIds).toEqual(['c', 'b']);
    expect(right.activePaneId).toBe('b');
  });

  it('uses left neighbor when source active pane is removed', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a', 'b', 'c'],
            activePaneId: 'b'
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['d'],
            activePaneId: 'd'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' },
        d: { id: 'd', title: 'D', componentKey: 'd' }
      }
    };

    const next = reduceMovePaneBetweenGroups(layout, 'b', 'left', 'right', 0);

    const root = asSplit(next.root);
    const left = asTabGroup(root.children[0]);
    const right = asTabGroup(root.children[1]);

    expect(left.paneIds).toEqual(['a', 'c']);
    expect(left.activePaneId).toBe('a');
    expect(right.paneIds).toEqual(['b', 'd']);
    expect(right.activePaneId).toBe('b');
  });

  it('uses right neighbor when source active pane is first', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a', 'b'],
            activePaneId: 'a'
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['c'],
            activePaneId: 'c'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceMovePaneBetweenGroups(layout, 'a', 'left', 'right', 0);

    const root = asSplit(next.root);
    const left = asTabGroup(root.children[0]);
    const right = asTabGroup(root.children[1]);

    expect(left.paneIds).toEqual(['b']);
    expect(left.activePaneId).toBe('b');
    expect(right.paneIds).toEqual(['a', 'c']);
    expect(right.activePaneId).toBe('a');
  });

  it('normalizes by removing empty groups and melting splits', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a'],
            activePaneId: 'a'
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['b'],
            activePaneId: 'b'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' }
      }
    };

    const next = reduceMovePaneBetweenGroups(layout, 'a', 'left', 'right', 1);

    expect(next).not.toBe(layout);

    const root = asTabGroup(next.root);
    expect(root.id).toBe('right');
    expect(root.paneIds).toEqual(['b', 'a']);
    expect(root.activePaneId).toBe('a');
  });

  it('moves across nested splits and normalizes', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          {
            type: 'split',
            id: 'left-split',
            direction: 'vertical',
            sizes: [60, 40],
            children: [
              {
                type: 'tab-group',
                id: 'left-top',
                paneIds: ['a'],
                activePaneId: 'a'
              },
              {
                type: 'tab-group',
                id: 'left-bottom',
                paneIds: ['b'],
                activePaneId: 'b'
              }
            ]
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['c'],
            activePaneId: 'c'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceMovePaneBetweenGroups(layout, 'a', 'left-top', 'right', 0);

    const root = asSplit(next.root);
    const left = asTabGroup(root.children[0]);
    const right = asTabGroup(root.children[1]);

    expect(left.id).toBe('left-bottom');
    expect(left.paneIds).toEqual(['b']);
    expect(right.paneIds).toEqual(['a', 'c']);
    expect(right.activePaneId).toBe('a');
  });

  // ---------------------------------------------------------------------------
  // NEW: normalization + sizing + sentinel guarantees
  // ---------------------------------------------------------------------------
  it('prunes empty non-root tab groups and melts resulting split', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a'],
            activePaneId: 'a'
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['b'],
            activePaneId: 'b'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' }
      }
    };

    const next = reduceClosePane(layout, 'left', 'a');

    expect(next).not.toBe(layout);

    const root = asTabGroup(next.root);
    expect(root.id).toBe('right');
    expect(root.paneIds).toEqual(['b']);
    expect(root.activePaneId).toBe('b');
  });

  it('rebalance sizes when a split child is pruned (shrinking split)', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [33, 33, 34],
        children: [
          { type: 'tab-group', id: 'g1', paneIds: ['a'], activePaneId: 'a' },
          { type: 'tab-group', id: 'g2', paneIds: ['b'], activePaneId: 'b' },
          { type: 'tab-group', id: 'g3', paneIds: ['c'], activePaneId: 'c' }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceClosePane(layout, 'g2', 'b');

    const root = asSplit(next.root);
    expect(root.children.length).toBe(2);
    expect(root.sizes.length).toBe(2);
    expectSizesSumTo100(root.sizes);
    expect(root.sizes[0]).toBeCloseTo(50, 2);
    expect(root.sizes[1]).toBeCloseTo(50, 2);

    const ids = root.children.map((c) => asTabGroup(c).id);
    expect(ids).toEqual(['g1', 'g3']);
  });

  it('root never disappears; closing the last root tab leaves an empty root tab-group', () => {
    const layout: DockLayout = {
      root: {
        type: 'tab-group',
        id: 'root-group',
        paneIds: ['a'],
        activePaneId: 'a'
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' }
      }
    };

    const next = reduceClosePane(layout, 'root-group', 'a');

    const root = asTabGroup(next.root);
    expect(root.paneIds).toEqual([]);
    expect(root.activePaneId).toBe('');
  });

  // OPTIONAL (only keep if you implement the duplicate-move guard):
  it('does not duplicate paneId when moving into a group that already contains it (defensive)', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [50, 50],
        children: [
          { type: 'tab-group', id: 'left', paneIds: ['a'], activePaneId: 'a' },
          { type: 'tab-group', id: 'right', paneIds: ['b', 'a'], activePaneId: 'b' }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' }
      }
    };

    const next = reduceMovePaneBetweenGroups(layout, 'a', 'left', 'right', 1);

    // preferred behavior: no change because it would duplicate
    expect(next).toBe(layout);
  });

  // ---------------------------------------------------------------------------
  // resize split
  // ---------------------------------------------------------------------------
  it('updates sizes for a split by id', () => {
    const next = reduceResizeSplit(baseLayout, 'root', [70, 30]);

    expect(next).not.toBe(baseLayout);
    const root = asSplit(next.root);
    const baseRoot = asSplit(baseLayout.root);
    expect(root.sizes).toEqual([70, 30]);
    expect(root.children).toBe(baseRoot.children);
  });

  it('updates sizes for a nested split', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [60, 40],
        children: [
          {
            type: 'split',
            id: 'inner',
            direction: 'vertical',
            sizes: [50, 50],
            children: [
              {
                type: 'tab-group',
                id: 'top',
                paneIds: ['a'],
                activePaneId: 'a'
              },
              {
                type: 'tab-group',
                id: 'bottom',
                paneIds: ['b'],
                activePaneId: 'b'
              }
            ]
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['c'],
            activePaneId: 'c'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' },
        c: { id: 'c', title: 'C', componentKey: 'c' }
      }
    };

    const next = reduceResizeSplit(layout, 'inner', [20, 80]);

    const root = asSplit(next.root);
    const inner = asSplit(root.children[0]);
    expect(inner.sizes).toEqual([20, 80]);
  });

  it('no-ops when splitId is not found', () => {
    const next = reduceResizeSplit(baseLayout, 'missing', [60, 40]);
    expect(next).toBe(baseLayout);
  });

  it('rejects invalid sizes', () => {
    const wrongLength = reduceResizeSplit(baseLayout, 'root', [100]);
    expect(wrongLength).toBe(baseLayout);

    const withNaN = reduceResizeSplit(baseLayout, 'root', [Number.NaN, 50]);
    expect(withNaN).toBe(baseLayout);

    const withInfinity = reduceResizeSplit(baseLayout, 'root', [Infinity, 50]);
    expect(withInfinity).toBe(baseLayout);

    const withZero = reduceResizeSplit(baseLayout, 'root', [0, 50]);
    expect(withZero).toBe(baseLayout);
  });

  it('normalizes sizes to sum exactly 100', () => {
    const next = reduceResizeSplit(baseLayout, 'root', [1, 1]);

    const root = asSplit(next.root);
    expectSizesSumTo100(root.sizes, 0.0001);
    expect(root.sizes[0]).toBeCloseTo(50, 5);
    expect(root.sizes[1]).toBeCloseTo(50, 5);
  });

  it('enforces minimum size of 5 percent', () => {
    const next = reduceResizeSplit(baseLayout, 'root', [1, 99]);

    const root = asSplit(next.root);
    expect(root.sizes[0]).toBeCloseTo(5, 5);
    expect(root.sizes[1]).toBeCloseTo(95, 5);
  });

  it('rejects impossible minimum redistribution', () => {
    const manyChildren = Array.from({ length: 21 }, (_, index) => ({
      type: 'tab-group' as const,
      id: `group-${index}`,
      paneIds: [`pane-${index}`],
      activePaneId: `pane-${index}`
    }));

    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: Array.from({ length: 21 }, () => 1),
        children: manyChildren
      },
      panesById: manyChildren.reduce<Record<string, { id: string; title: string; componentKey: string }>>(
        (acc, group, index) => {
          const paneId = `pane-${index}`;
          acc[paneId] = { id: paneId, title: paneId, componentKey: paneId };
          return acc;
        },
        {}
      )
    };

    const next = reduceResizeSplit(layout, 'root', Array.from({ length: 21 }, () => 1));
    expect(next).toBe(layout);
  });

  it('does not alter tree structure when resizing', () => {
    const next = reduceResizeSplit(baseLayout, 'root', [65, 35]);

    const root = asSplit(next.root);
    const baseRoot = asSplit(baseLayout.root);
    expect(root.children).toBe(baseRoot.children);
  });

  it('is idempotent when sizes are effectively unchanged', () => {
    const baseRoot = asSplit(baseLayout.root);
    const next = reduceResizeSplit(baseLayout, 'root', [...baseRoot.sizes]);
    expect(next).toBe(baseLayout);
  });

  it('updates even when existing sizes are malformed', () => {
    const layout: DockLayout = {
      root: {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        sizes: [100],
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a'],
            activePaneId: 'a'
          },
          {
            type: 'tab-group',
            id: 'right',
            paneIds: ['b'],
            activePaneId: 'b'
          }
        ]
      },
      panesById: {
        a: { id: 'a', title: 'A', componentKey: 'a' },
        b: { id: 'b', title: 'B', componentKey: 'b' }
      }
    };

    const next = reduceResizeSplit(layout, 'root', [40, 60]);

    const root = asSplit(next.root);
    expect(root.sizes).toEqual([40, 60]);
  });
});

describe('reduceRestorePaneToGroup', () => {
  const baseLayout: DockLayout = {
    root: {
      type: 'split',
      id: 'root',
      direction: 'horizontal',
      sizes: [50, 50],
      children: [
        {
          type: 'tab-group',
          id: 'left',
          paneIds: ['a'],
          activePaneId: 'a'
        },
        {
          type: 'tab-group',
          id: 'right',
          paneIds: ['c'],
          activePaneId: 'c'
        }
      ]
    },
    panesById: {
      a: { id: 'a', title: 'A', componentKey: 'a' },
      b: { id: 'b', title: 'B', componentKey: 'b' },
      c: { id: 'c', title: 'C', componentKey: 'c' },
      d: { id: 'd', title: 'D', componentKey: 'd' }
    }
  };

  function getGroup(layout: DockLayout, groupId: string): TabGroupNode {
    const visit = (node: LayoutNode): TabGroupNode | null => {
      if (node.type === 'tab-group') {
        return node.id === groupId ? node : null;
      }
      for (const child of node.children) {
        const result = visit(child);
        if (result) {
          return result;
        }
      }
      return null;
    };

    const group = visit(layout.root);
    if (!group) {
      fail(`expected group ${groupId}`);
      throw new Error('unreachable');
    }

    return group;
  }

  it('restores by appending when no index provided', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'b');

    expect(next).not.toBe(baseLayout);
    const left = getGroup(next, 'left');
    expect(left.paneIds).toEqual(['a', 'b']);
    expect(left.activePaneId).toBe('b');
  });

  it('restores by inserting at index 0', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'b', { index: 0 });

    const left = getGroup(next, 'left');
    expect(left.paneIds).toEqual(['b', 'a']);
    expect(left.activePaneId).toBe('b');
  });

  it('restores by inserting at a middle index', () => {
    const splitRoot = baseLayout.root as SplitNode;
    const layout: DockLayout = {
      ...baseLayout,
      root: {
        ...splitRoot,
        children: [
          {
            type: 'tab-group',
            id: 'left',
            paneIds: ['a', 'c', 'd'],
            activePaneId: 'a'
          },
         splitRoot.children[1]
        ]
      }
    };

    const next = reduceRestorePaneToGroup(layout, 'left', 'b', { index: 1 });

    const left = getGroup(next, 'left');
    expect(left.paneIds).toEqual(['a', 'b', 'c', 'd']);
  });

  it('restores with index > length clamps to append', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'b', { index: 999 });

    const left = getGroup(next, 'left');
    expect(left.paneIds).toEqual(['a', 'b']);
  });

  it('activates restored pane by default', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'b');

    const left = getGroup(next, 'left');
    expect(left.activePaneId).toBe('b');
  });

  it('respects activate:false', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'b', { activate: false });

    const left = getGroup(next, 'left');
    expect(left.paneIds).toEqual(['a', 'b']);
    expect(left.activePaneId).toBe('a');
  });

  it('no-ops when paneId is not in panesById', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'missing-pane');

    expect(next).toBe(baseLayout);
  });

  it('no-ops when groupId is not found', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'missing-group', 'b');

    expect(next).toBe(baseLayout);
  });

  it('no-ops when paneId is already open anywhere', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'c');

    expect(next).toBe(baseLayout);
  });

  it('no-ops when paneId is already present in same group', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'a');

    expect(next).toBe(baseLayout);
  });

  it('ensures pane belongs to exactly target group after success', () => {
    const next = reduceRestorePaneToGroup(baseLayout, 'left', 'b');

    expect(findGroupIdForPane(next, 'b')).toBe('left');
  });
});

describe('maximize pane commands', () => {
  const layout: DockLayout = {
    root: {
      type: 'split',
      id: 'root',
      direction: 'horizontal',
      sizes: [50, 50],
      children: [
        {
          type: 'tab-group',
          id: 'left',
          paneIds: ['a', 'b'],
          activePaneId: 'a'
        },
        {
          type: 'tab-group',
          id: 'right',
          paneIds: ['c'],
          activePaneId: 'c'
        }
      ]
    },
    panesById: {
      a: { id: 'a', title: 'A', componentKey: 'a' },
      b: { id: 'b', title: 'B', componentKey: 'b' },
      c: { id: 'c', title: 'C', componentKey: 'c' }
    }
  };

  function setup(): { store: DockStore; commands: DockCommands } {
    const store = new DockStore();
    store.setLayout(structuredClone(layout));
    return { store, commands: new DockCommands(store) };
  }

  it('maximizePane captures snapshot and sets maximizedPaneId', () => {
    const { store, commands } = setup();

    commands.maximizePane('b');

    expect(store.maximizedPaneId()).toBe('b');
    expect(store.preMaxLayout()).not.toBeNull();

    const snapshot = store.preMaxLayout()!;
    expect(snapshot).not.toBe(store.layout());
    expect(snapshot.root).not.toBe(store.layout().root);
  });

  it('exitMaximizeRestore restores snapshot and clears maximize state', () => {
    const { store, commands } = setup();

    commands.maximizePane('b');

    const snapshot = store.preMaxLayout();
    if (!snapshot) {
      fail('expected preMaxLayout snapshot to be set after maximize');
      return;
    }

    commands.exitMaximizeRestore();

    expect(store.maximizedPaneId()).toBeNull();
    expect(store.preMaxLayout()).toBeNull();
    expect(store.layout()).toBe(snapshot); // reference equality is correct here
  });

  it('exitMaximizeClose closes from snapshot layout', () => {
    const { store, commands } = setup();
    const snapshot = structuredClone(layout);
    const groupId = findGroupIdForPane(snapshot, 'b');
    if (!groupId) {
      fail('expected groupId for pane');
      return;
    }

    const expected = reduceClosePane(snapshot, groupId, 'b');

    commands.maximizePane('b');
    commands.exitMaximizeClose();

    expect(store.maximizedPaneId()).toBeNull();
    expect(store.preMaxLayout()).toBeNull();
    expect(store.layout()).toEqual(expected);
  });

  it('exitMaximizeRestore no-ops when not maximized', () => {
    const { store, commands } = setup();
    const before = store.layout();

    commands.exitMaximizeRestore();

    expect(store.layout()).toBe(before);
  });

  it('exitMaximizeClose no-ops when not maximized', () => {
    const { store, commands } = setup();
    const before = store.layout();

    commands.exitMaximizeClose();

    expect(store.layout()).toBe(before);
  });

  it('maximizePane no-ops for unknown pane', () => {
    const { store, commands } = setup();
    const before = store.layout();

    commands.maximizePane('missing');

    expect(store.maximizedPaneId()).toBeNull();
    expect(store.preMaxLayout()).toBeNull();
    expect(store.layout()).toBe(before);
  });
});
