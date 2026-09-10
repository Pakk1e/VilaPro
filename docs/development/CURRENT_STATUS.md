# VilaPro / Lab OS — Current Development Status

## Current branch

`v0.4/workspace-architecture`

## Repository paths

- Backend / Worlds: `worlds/`
- Frontend project: `frontend-dev/`
- Frontend Worlds application: `frontend-dev/src/applications/worlds/`

## Current focus

Phase 5 — Simulation Runtime & Static/Live Architecture.

The architecture separates:

1. **Analysis type** — DC, transient, AC, and future analyses.
2. **Execution mode** — Static or Live.

Static execution remains request → execution → complete result. Live execution is being developed as a session/runtime with evolving state and sampled updates.

## Completed foundations

- Simulation execution modes (`static`, `live`).
- Live simulation state foundation.
- Live simulation session manager.
- First Live DC runtime boundary.
- Live simulation application service.
- HTTP lifecycle endpoints for Live simulations.
- Stable Live snapshot API contract.
- Repository engineering guidance in `AGENTS.md`.
- GitHub Actions CI for Worlds and frontend checks.
- Canonical development scripts under `scripts/`.

## Current architectural priorities

1. Refine the Live DC runtime beyond the initial runtime boundary.
2. Remove duplicated model-building logic by introducing a shared model-building/application abstraction.
3. Continue the Live architecture without coupling it to electrical simulation specifically.
4. Build Live AC after the Live DC foundation is structurally sound.
5. Continue strengthening the frontend Worlds visual system model independently from the backend simulation representation.
6. Preserve reusable result/dataset/series/plot infrastructure for DC, transient, AC, and future analyses.

## Development workflow

Use the canonical scripts from the repository root:

```bash
./scripts/test-backend.sh
./scripts/test-frontend.sh
./scripts/test-all.sh
./scripts/lint-frontend.sh
./scripts/build-frontend.sh
```

CI is the clean-environment source of truth for committed changes.

## Definition of done

A feature is considered complete when implementation, relevant tests, documentation/architecture impact, diff review, and applicable CI checks have been addressed. Deployment is separate unless explicitly requested.
