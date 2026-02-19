import { DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DockStore } from '../state/dock-store';
import { DockRendererComponent } from './dock-renderer.component';
import { DockUiContext } from './dock-ui-context';

@Component({
  selector: 'dock-root',
  standalone: true,
  imports: [DockRendererComponent, DragDropModule],
  providers: [DockUiContext],
  template: `
    <section class="dock-root" cdkDropListGroup>
      @if (store) {
        <dock-renderer [node]="store.layout().root" [store]="store"></dock-renderer>
      } 
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
      .dock-root {
        display: block;
        width: 100%;
        height: 100%;
        background: #0001a;
      }
      .debug { color: white; padding: 8px; font-size: 12px; overflow: auto; max-height: 40vh; }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockRootComponent {
  @Input({ required: true }) store!: DockStore;
}
