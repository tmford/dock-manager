import { DragDropModule, CdkDragDrop, CdkDragEnter, CdkDragExit } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, inject, signal } from '@angular/core';
import { LayoutNode } from '../model/layout-node';
import { SplitNode } from '../model/split-node';
import { TabGroupNode } from '../model/tab-group-node';
import { DockCommands } from '../state/dock-commands';
import { DockStore } from '../state/dock-store';
import { DockPaneHostComponent } from './dock-pane-host.component';

@Component({
  selector: 'dock-renderer',
  standalone: true,
  imports: [DockPaneHostComponent, DragDropModule, NgTemplateOutlet],
  template: `
    <ng-template #rendererTpl let-node>
      @switch (node.type) {
        @case ('split') {
          @let split = splitNode(node);
          <div
            class="dock-split"
            [class.horizontal]="split.direction === 'horizontal'"
            [class.vertical]="split.direction === 'vertical'"
          >
            @for (child of split.children; track child.id; let index = $index) {
              <div class="split-child" [style.flex]="childFlex(split, index)">
                <ng-container
                  [ngTemplateOutlet]="rendererTpl"
                  [ngTemplateOutletContext]="{ $implicit: child }"
                ></ng-container>
              </div>
              @if (index < split.children.length - 1) {
                <div
                  class="split-gutter"
                  [class.horizontal]="split.direction === 'horizontal'"
                  [class.vertical]="split.direction === 'vertical'"
                  (pointerdown)="startResize($event, split.id, split.direction, index)"
                ></div>
              }
            }
          </div>
        }
        @case ('tab-group') {
          @let group = tabGroup(node);
          @let layout = store.layout();
          @let panes = layout.panesById;
          @let activePane = panes[group.activePaneId];

          <div class="dock-tabs">
            <div
              class="tab-strip"
              cdkDropList
              [id]="group.id"
              [cdkDropListData]="group.paneIds"
              cdkDropListOrientation="horizontal"
              (cdkDropListEntered)="onDropListEntered($event)"
              (cdkDropListExited)="onDropListExited($event)"
              (cdkDropListDropped)="drop($event)"
              [class.drop-hover]="hoveredDropListId() === group.id"
            >
              @for (paneId of group.paneIds; track paneId) {
                @let pane = panes[paneId];
                <div
                  class="tab"
                  cdkDrag
                  [cdkDragData]="paneId"
                  (cdkDragEnded)="clearHover()"
                  [class.active]="paneId === group.activePaneId"
                >
                  <button
                    type="button"
                    class="tab-activate"
                    cdkDragHandle
                    [attr.aria-label]="'Activate ' + (pane?.title || paneId)"
                    (click)="activate(group.id, paneId)"
                  >
                    <span class="tab-title">{{ pane?.title || paneId }}</span>
                  </button>
                  <button
                    type="button"
                    class="close-tab"
                    aria-label="Close tab"
                    (pointerdown)="blockDrag($event)"
                    (click)="close(group.id, paneId, $event)"
                  >
                    ×
                  </button>
                </div>
              }
            </div>
            <div class="tab-body"
              cdkDropList
              [id]="paneDropId(group.id)"
              cdkDropListOrientation="horizontal"
              [cdkDropListSortingDisabled]="true"
              (cdkDropListEntered)="onDropListEntered($event)"
              (cdkDropListExited)="onDropListExited($event)"
              (cdkDropListDropped)="drop($event)"
              [class.drop-hover]="hoveredDropListId() === paneDropId(group.id)"
            >
              @if (activePane) {
                <dock-pane-host [pane]="activePane"></dock-pane-host>
              } @else {
                <div class="empty">No active pane</div>
              }
            </div>
          </div>
        }
      }
    </ng-template>

    <ng-container
      [ngTemplateOutlet]="rendererTpl"
      [ngTemplateOutletContext]="{ $implicit: node }"
    ></ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .dock-split {
        display: flex;
        width: 100%;
        height: 100%;
        gap: 1px;
        background: #1e293b;
      }

      .dock-split.horizontal {
        flex-direction: row;
      }

      .dock-split.vertical {
        flex-direction: column;
      }

      .split-child {
        display: flex;
        min-width: 0;
        min-height: 0;
        background: #0f172a;
      }

      .split-gutter {
        flex: 0 0 6px;
        background: #0b1220;
        transition: background 120ms ease;
        touch-action: none;
      }

      .split-gutter.horizontal {
        cursor: col-resize;
      }

      .split-gutter.vertical {
        cursor: row-resize;
      }

      .split-gutter:hover {
        background: #1f2937;
      }

      .dock-tabs {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        border: 1px solid #334155;
        background: #0b1120;
      }

      .tab-strip {
        display: flex;
        gap: 0.25rem;
        padding: 0.35rem 0.5rem;
        background: hsla(221, 39%, 11%, 1.00);
        border-bottom: 1px solid #1f2937;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        scrollbar-width: thin;
        scrollbar-color: #475569 transparent;
      }

      .tab {
        display: inline-flex;
        align-items: center;
        border-radius: 6px;
        overflow: hidden;
        background: #0f172a;
        color: #cbd5f5;
        border: 1px solid transparent;
        flex: 0 0 auto;
      }

      .tab.active {
        border-color: #38bdf8;
        color: #e0f2fe;
        background: #0b2a42;
      }

      .tab-activate {
        border: 0;
        background: transparent;
        color: inherit;
        padding: 0.3rem 0.6rem;
        cursor: pointer;
        font-size: 0.8rem;
        display: inline-flex;
        align-items: center;
      }

      .close-tab {
        border: 0;
        background: transparent;
        color: inherit;
        font-weight: 600;
        opacity: 0.7;
        cursor: pointer;
        padding: 0 0.45rem;
        line-height: 1;
        flex: 0 0 auto;
      }

      .close-tab:hover { opacity: 1; }

      .close-tab:focus-visible,
      .tab-activate:focus-visible {
        outline: 2px solid #38bdf8;
        outline-offset: 2px;
      }

      .tab-body {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }

      .empty {
        padding: 0.75rem;
        color: #94a3b8;
        font-size: 0.85rem;
      }
      
      .tab-strip.drop-hover {
        outline: 2px solid #38bdf8;
        outline-offset: 2px;
      }

      .tab-body.drop-hover {
        box-shadow: inset 0 0 0 2px #38bdf8;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockRendererComponent {
  @Input({ required: true }) node!: LayoutNode;
  @Input({ required: true }) store!: DockStore;
  private readonly commands = inject(DockCommands);
  private readonly destroyRef = inject(DestroyRef);
  private static readonly PANE_DROP_SUFFIX = '__pane_drop__';
  //private hoveredDropListId: string | null = null;
  readonly hoveredDropListId = signal<string | null>(null);
  readonly activeResize = signal<null | {
    splitId: string;
    direction: 'horizontal' | 'vertical';
    index: number;
    startClient: number;
    startSizes: number[];
    containerPx: number;
    gutterEl: HTMLElement;
  }>(null);

  private readonly onWindowMove = (event: PointerEvent) => this.onResizeMove(event);
  private readonly onWindowUp = () => this.endResize();
  private readonly onLostPointerCapture = (_event: PointerEvent) => this.endResize();

  constructor() {
    this.destroyRef.onDestroy(() => this.endResize());
  }
  splitNode(node: LayoutNode): SplitNode {
    if (node.type !== 'split') {
      throw new Error(`dock-renderer received node.type=${node.type}`);
    }

    return node as SplitNode;
  }

  tabGroup(node: LayoutNode): TabGroupNode {
    if (node.type !== 'tab-group') {
      throw new Error(`dock-renderer received node.type=${node.type}`);
    }

    return node as TabGroupNode;
  }

  childFlex(split: SplitNode, index: number): string {
    const size = split.sizes?.[index];
    if (typeof size === 'number' && size > 0) {
      return `0 0 ${size}%`;
    }

    return '1 1 0';
  }

  startResize(
    event: PointerEvent,
    splitId: string,
    direction: 'horizontal' | 'vertical',
    index: number
  ): void {
    event.preventDefault();
    event.stopPropagation();

    // If a resize is already active, fully clean it up first.
    this.endResize();

    const gutter = event.currentTarget as HTMLElement | null;
    if (!gutter) return;

    try {
      gutter.setPointerCapture?.(event.pointerId);
    } catch {
      // Some browsers can throw if capture fails — ignore safely.
    }

    const container = gutter.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerPx = direction === 'horizontal' ? rect.width : rect.height;
    if (!Number.isFinite(containerPx) || containerPx <= 0) return;

    const split = this.findSplit(this.store.layout().root, splitId);
    if (!split) return;

    const startSizes = this.getSplitSizes(split);
    if (index < 0 || index >= startSizes.length - 1) return;

    this.activeResize.set({
      splitId,
      direction,
      index,
      startClient: direction === 'horizontal' ? event.clientX : event.clientY,
      startSizes: startSizes.slice(),
      containerPx,
      gutterEl: gutter
    });

    gutter.addEventListener('lostpointercapture', this.onLostPointerCapture);

    window.addEventListener('pointermove', this.onWindowMove);
    window.addEventListener('pointerup', this.onWindowUp);
    window.addEventListener('pointercancel', this.onWindowUp);
  }

  onResizeMove(event: PointerEvent): void {
    const active = this.activeResize();
    if (!active) {
      return;
    }

    if (!Number.isFinite(active.containerPx) || active.containerPx <= 0) return;

    const currentClient =
      active.direction === 'horizontal' ? event.clientX : event.clientY;
    const deltaPx = currentClient - active.startClient;
    const deltaPct = (deltaPx / active.containerPx) * 100;
    if (!Number.isFinite(deltaPct)) {
      return;
    }

    const minPercent = 10;
    const index = active.index;
    const pairTotal = active.startSizes[index] + active.startSizes[index + 1];
    if (pairTotal < minPercent * 2) {
      return;
    }

    let left = active.startSizes[index] + deltaPct;
    let right = active.startSizes[index + 1] - deltaPct;

    if (left < minPercent) {
      left = minPercent;
      right = pairTotal - left;
    } else if (right < minPercent) {
      right = minPercent;
      left = pairTotal - right;
    }

    left = Math.max(minPercent, left);
    right = Math.max(minPercent, right);

    const nextSizes = active.startSizes.slice();
    nextSizes[index] = left;
    nextSizes[index + 1] = right;

    this.commands.resizeSplit(active.splitId, nextSizes);
  }

  endResize(): void {
    const active = this.activeResize();
    if (!active) return;

    active.gutterEl.removeEventListener('lostpointercapture', this.onLostPointerCapture);

    window.removeEventListener('pointermove', this.onWindowMove);
    window.removeEventListener('pointerup', this.onWindowUp);
    window.removeEventListener('pointercancel', this.onWindowUp);

    this.activeResize.set(null);
  }

  activate(groupId: string, paneId: string): void {
    this.commands.setActivePane(groupId, paneId);
  }

  close(groupId: string, paneId: string, event: Event): void {
    event.stopPropagation();
    this.commands.closePane(groupId, paneId);
  }

  blockDrag(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  paneDropId(groupId: string): string {
    return `${groupId}${DockRendererComponent.PANE_DROP_SUFFIX}`;
  }

  private normalizeGroupId(dropListId: string): { groupId: string; isPaneDrop: boolean } {
    const suffix = DockRendererComponent.PANE_DROP_SUFFIX;
    if (dropListId.endsWith(suffix)) {
      return { groupId: dropListId.slice(0, -suffix.length), isPaneDrop: true };
    }
    return { groupId: dropListId, isPaneDrop: false };
  }
  private findGroupPaneCount(groupId: string): number | null {

    const root = this.store.layout().root;

    const visit = (node: LayoutNode): number | null => {
      if (node.type === 'tab-group') {
        return node.id === groupId ? node.paneIds.length : null;
      }
      for (const child of (node as SplitNode).children) {
        const hit = visit(child);
        if (hit !== null) return hit;
      }
      return null;
    };
  
    return visit(root);
  }

  drop(event: CdkDragDrop<string[]>): void {

    this.hoveredDropListId.set(null);

    const rawToId = event.container?.id;
    const rawFromId = event.previousContainer?.id;
    const paneId = event.item?.data as string | undefined;

    if (!rawToId || !rawFromId || !paneId) {
      return;
    }

    const to = this.normalizeGroupId(rawToId);
    const from = this.normalizeGroupId(rawFromId);

    // Same logical group:
    if (from.groupId === to.groupId) {
      // strip -> strip reorder
      if (event.previousContainer === event.container) {
        this.commands.reorderPaneWithinGroup(to.groupId, event.previousIndex, event.currentIndex);
        return;
      }

      // strip -> pane-body drop (same group): move to end (optional nice UX)
      const count = this.findGroupPaneCount(to.groupId);
      if (count === null || count <= 1) {
        return;
      }

      this.commands.reorderPaneWithinGroup(to.groupId, event.previousIndex, count - 1);
      return;
    }

    // Cross-group move:
    // If dropping onto pane area, insert at END. Otherwise use computed index.
    //const toIndex = to.isPaneDrop ? Number.MAX_SAFE_INTEGER : event.currentIndex;
    const toIndex = to.isPaneDrop
      ? this.findGroupPaneCount(to.groupId) ?? 0
      : event.currentIndex;

    this.commands.movePaneBetweenGroups(paneId, from.groupId, to.groupId, toIndex);
  }

  onDropListEntered(event: CdkDragEnter<string[]>): void {
    this.hoveredDropListId.set(event.container?.id ?? null);
  }

  onDropListExited(event: CdkDragExit<string[]>): void {
    const id = event.container?.id ?? null;
    if (this.hoveredDropListId() === id) {
      this.hoveredDropListId.set(null);
    }
  }
  isHovering(id: string): boolean {
    return this.hoveredDropListId() === id;
  }
  clearHover(): void {
    this.hoveredDropListId.set(null);
  }

  private getSplitSizes(split: SplitNode): number[] {
    const count = split.children.length;
    const sizes = split.sizes ?? [];
    if (sizes.length === count && sizes.every((size) => Number.isFinite(size) && size > 0)) {
      const total = sizes.reduce((sum, size) => sum + size, 0);
      if (Number.isFinite(total) && total > 0) {
        return sizes.map((size) => (size / total) * 100);
      }
    }

    return Array.from({ length: count }, () => 100 / count);
  }

  private findSplit(node: LayoutNode, splitId: string): SplitNode | null {
    if (node.type === 'split') {
      if (node.id === splitId) {
        return node;
      }

      for (const child of node.children) {
        const result = this.findSplit(child, splitId);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }
}
