<!-- markdownlint-disable MD033 -->
# Dock Manager Architecture (v0)

## Goal

Build a dockable layout system similar to DockView/GoldenLayout, implemented purely in Angular using Signals.
The output will be an Angular library with a demo app for development and regression testing.

## Core ideas

- Layout is a tree of nodes (splits + tab groups).
- Rendering is recursive: root -> split -> tabs -> panes.
- State is managed via a signals-based store (single source of truth).
- All layout mutations go through explicit commands (no hidden component state).

## Data model (initial)

### Pane

- id: string
- title: string
- componentKey: string (maps to a component in demo app)
- inputs?: Record<string, any>

### TabGroup

- id: string
- paneIds: string[]
- activePaneId: string

### SplitNode

- id: string
- direction: 'horizontal' | 'vertical'
- children: LayoutNode[] (2 children for now)
- sizes: number[] (percentages, same length as children)

### LayoutNode

- SplitNode | TabGroup

### DockLayout

- root: LayoutNode
- panesById: Record<string, Pane>

## Components (initial)

- <dock-root> : takes layout/store, renders root node
- <dock-split> : renders children with flex layout + (later) splitter
- <dock-tabs> : renders tab strip + active pane body
- <dock-pane-host> : renders pane content (demo uses componentKey mapping)

## Store + commands (initial)

Store signals:

- layout: signal<DockLayout>
- activePaneId (optional if stored inside TabGroup)

Commands (Phase 2+):

- setActivePane(groupId, paneId)
- closePane(groupId, paneId)
- movePane(paneId, fromGroupId, toGroupId, index)
- splitGroup(groupId, direction, newGroupId/newPaneId)
- resizeSplit(splitId, sizes)

## Non-goals (for now)

- Persistence/serialization
- Drag/drop
- Fancy animations
- Nested docking targets beyond basic splits
