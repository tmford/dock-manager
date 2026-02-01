<!-- markdownlint-disable MD033 -->

# Codex Guidelines (Repo Rules)

These rules apply to any AI-assisted edits in this repo.

## Non-negotiables

- This project is **zoneless**. Do not introduce `zone.js` or patterns that depend on it.
- Use **Angular Signals exclusively** for application/library state. Avoid RxJS unless explicitly requested.
- Use `ChangeDetectionStrategy.OnPush` for all components.
- Prefer standalone APIs where applicable and modern Angular patterns.

## Allowed edit scope

Only modify files inside:

- `dock-workspace/projects/dock-manager/src/lib/`
- `dock-workspace/projects/demo/src/app/`

Do not modify anything else unless explicitly requested.

## Architecture sources of truth

Before implementing changes, consult:

- `docs/architecture.md`
- `docs/roadmap.md`

Follow the phased roadmap. Do not skip phases.

## Implementation discipline

- All layout mutations must go through a **signals-based store + explicit command API**.
- Keep changes minimal and reviewable. Prefer small PR-sized chunks.

## Output expectations

- Show changes as file-specific edits with correct paths.
- If a request implies broad refactors, ask for clarification or propose a smaller step plan first.
