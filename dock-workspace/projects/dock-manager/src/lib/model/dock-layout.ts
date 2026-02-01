import { LayoutNode } from './layout-node';
import { Pane } from './pane';

export interface DockLayout {
  root: LayoutNode;
  panesById: Record<string, Pane>;
}
