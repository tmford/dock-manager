import { DockLayout } from '../model/dock-layout';
import { reduceSetActivePane } from './dock-reducers';

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

  it('sets active pane in existing group', () => {
    const next = reduceSetActivePane(baseLayout, 'left', 'b');

    expect(next).not.toBe(baseLayout);
    if (next.root.type === 'split') {
      const left = next.root.children[0];
      if (left.type === 'tab-group') {
        expect(left.activePaneId).toBe('b');
      } else {
        fail('expected tab-group node');
      }
    } else {
      fail('expected split root');
    }
  });

  it('no-ops when groupId is not found', () => {
    const next = reduceSetActivePane(baseLayout, 'missing', 'b');

    expect(next).toBe(baseLayout);
  });

  it('no-ops when paneId is not in that group', () => {
    const next = reduceSetActivePane(baseLayout, 'left', 'c');

    expect(next).toBe(baseLayout);
  });
});
