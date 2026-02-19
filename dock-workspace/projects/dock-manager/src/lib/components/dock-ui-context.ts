import { Injectable, signal } from '@angular/core';

@Injectable()
export class DockUiContext {
  readonly focusedGroupId = signal<string | null>(null);

  setFocusedGroupId(groupId: string | null) {
    this.focusedGroupId.set(groupId);
  }
}