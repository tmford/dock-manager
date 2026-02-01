import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Pane } from '../model/pane';

@Component({
  selector: 'dock-pane-host',
  standalone: true,
  template: `
    <div class="pane-host">
      <div class="pane-title">{{ pane.title }}</div>
      <div class="pane-meta">
        <span>id: {{ pane.id }}</span>
        <span>key: {{ pane.componentKey }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .pane-host {
        display: grid;
        gap: 0.35rem;
        padding: 0.75rem;
        color: #e2e8f0;
        font-size: 0.9rem;
      }

      .pane-title {
        font-size: 1rem;
        font-weight: 600;
      }

      .pane-meta {
        display: flex;
        gap: 0.75rem;
        color: #94a3b8;
        font-size: 0.8rem;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockPaneHostComponent {
  @Input({ required: true }) pane!: Pane;
}
