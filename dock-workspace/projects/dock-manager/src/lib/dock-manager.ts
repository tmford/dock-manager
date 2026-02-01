import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-dock-manager',
  standalone: true,
  template: `
    <p>dock-manager works!</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockManager {}
