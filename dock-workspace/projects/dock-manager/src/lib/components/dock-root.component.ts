import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DockStore } from '../state/dock-store';
import { DockNodeComponent } from './dock-node.component';

@Component({
  selector: 'dock-root',
  standalone: true,
  imports: [DockNodeComponent],
  template: `
    <section class="dock-root">
      @if (store) {
        <dock-node [node]="store.layout().root" [store]="store"></dock-node>
      }
    </section>
  `,
  styles: [
    `
      .dock-root {
        display: block;
        width: 100%;
        height: 100%;
        background: #0f172a;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockRootComponent {
  @Input({ required: true }) store!: DockStore;
}
