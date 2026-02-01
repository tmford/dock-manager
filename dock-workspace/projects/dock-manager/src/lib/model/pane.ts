export interface Pane {
  id: string;
  title: string;
  componentKey: string;
  inputs?: Record<string, unknown>;
}
