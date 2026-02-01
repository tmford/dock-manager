# Roadmap

## Phase 0: Repo + workspace

- Angular workspace with demo app + dock-manager library
- Docs baseline committed

## Phase 1: Static rendering

- Implement layout types
- Render split + tabs + pane host
- Demo shows a nested layout and basic tab switching

## Phase 2: Commands + state discipline

- All mutations via commands service
- Unit tests for commands/reducers
- Close tab, activate tab

## Phase 3: Drag & drop tabs (Angular CDK)

- Reorder tabs within group
- Move tab between groups
- Uses command API

## Phase 4: Resizable splits

- Splitter UI
- Persist sizes in layout state

## Phase 5: Persistence + serialization

- Serialize layout state to JSON
- Restore layout
