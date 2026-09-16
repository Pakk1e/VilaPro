# VilaPro / Lab OS

VilaPro is the broader project repository containing the Vadovsky Tech application and the Lab OS experimental system-modeling work.

## Lab OS Worlds

Lab OS is a learning-oriented interactive sandbox for building, simulating, inspecting, and experimenting with systems at different levels of abstraction.

The active Worlds implementation is the **Electrical World**: a schematic-first circuit workspace with editable components, semantic connections, simulation, results, and contextual inspection/instruments.

The long-term direction is a Universe containing multiple Worlds and meaningful abstraction Layers. See the canonical documentation before extending the architecture.

## Start here

For engineering work, begin with [`docs/START_HERE.md`](docs/START_HERE.md). It is the documentation router and identifies which document is authoritative for each kind of question.

Key references:

- `docs/CURRENT_STATUS.md` — current implementation state and next priorities
- `ARCHITECTURE.md` — engineering source of truth
- `docs/worlds/interaction-model.md` — Worlds interaction conventions
- `docs/worlds/acceptance-matrix.md` — browser acceptance contracts
- `docs/development/development-workflow.md` — development and deployment workflow
- `docs/development/testing.md` — testing and failure-diagnosis strategy
- `docs/development/server-runner.md` — self-hosted CI runner contract
- `docs/DECISIONS.md` and `docs/decisions/` — durable project decisions

## Development model

GitHub is the source of truth. The self-hosted Worlds runner is a build/deployment/browser-verification worker, not a second source tree.

The normal loop is:

```text
Read canonical docs
  → inspect code/tests
  → implement
  → test
  → build/deploy exact revision when required
  → Worlds browser acceptance
  → inspect evidence on failure
  → update canonical docs when project truth changes
```

Worlds UI changes require behavioral browser verification; a successful build alone is not considered sufficient.

## Repository areas

- `frontend-dev/` — active frontend application and Worlds implementation
- backend/project application directories — existing application services
- `.github/workflows/` — CI/deployment workflows
- `docs/` — canonical project, architecture, workflow, and acceptance documentation

## Existing application stack

The broader repository includes React/Vite frontend work and Node.js/Express services. Infrastructure currently includes a Linux server, Cloudflare, and Tailscale. Individual application areas may have additional dependencies; consult their package manifests and canonical documentation rather than assuming one universal stack.

## Documentation policy

Do not maintain a second engineering source of truth in uploaded files, server-local notes, or external documentation platforms. Temporary implementation specifications may live under `docs/superpowers/`, but durable project knowledge belongs in the canonical `docs/` documents and architecture files.
