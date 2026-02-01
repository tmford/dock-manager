export interface TabGroupNode {
  type: 'tab-group';
  id: string;
  paneIds: string[];
  activePaneId: string;
}
