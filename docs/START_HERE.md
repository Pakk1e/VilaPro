# Lab OS — Start Here

This is the first document an AI engineering session should read when continuing Lab OS work.

## Project in one paragraph

Lab OS is a learning-oriented interactive sandbox for exploring how systems work by building, simulating, inspecting, and experimenting with them at different levels of abstraction. The current focus is the Electrical World and a useful circuit simulator. The long-term direction is a Universe containing different Worlds, where each World can have its own meaningful hierarchy of Layers, models, simulations, visualizations, and UI.

## Documentation source of truth

Engineering and product truth lives in this repository. Do not rely on uploaded copies, server-local edits, old chat summaries, or external notes when the current repository contains the canonical document.

Use this hierarchy:

| Document | Canonical purpose | Read when | Update when |
|---|---|---|---|
| `VISION.md` | Product/learning vision | Product direction changes | Vision changes |
| `docs/CONCEPTS.md` | Canonical terminology | A concept or term is unclear | Terminology changes |
| `docs/LAYER_MODEL.md` | Layer/abstraction rules | Designing Layers or navigation | Layer semantics change |
| `docs/WORLDS.md` | World-level direction | Designing Worlds | World direction changes |
| `ARCHITECTURE.md` | Engineering boundaries | Architectural or cross-layer changes | Engineering boundaries change |
| `docs/SIMULATION_ARCHITECTURE.md` | Simulation boundaries | Simulation/backend work | Simulation architecture changes |
| `docs/DECISIONS.md` | Existing project decisions | A design choice may already be settled | A project decision is made |
| `docs/CURRENT_STATUS.md` | Current implementation/handoff state | Every new engineering session | Established state, priorities, or validation changes |
| `docs/AI_ENGINEERING_CONTRACT.md` | AI operating rules | Every engineering session | AI workflow rules change |
| `docs/WORKFLOW_OPTIMIZATION.md` | Development/CI optimization | CI or development workflow changes | Workflow changes |
| `docs/development/development-workflow.md` | Practical development workflow | Before implementation/deployment | Workflow changes |
| `docs/development/testing.md` | Testing strategy and diagnosis | Before adding/fixing tests | Testing strategy changes |
| `docs/development/server-runner.md` | Self-hosted runner contract | Runner/CI/server work | Runner assumptions change |
| `docs/worlds/interaction-model.md` | Worlds interaction conventions | Worlds UI work | Interaction model changes |
| `docs/worlds/acceptance-matrix.md` | User behavior → acceptance coverage | Worlds acceptance changes | Behavior/test contracts change |
| `docs/decisions/ADR-*.md` | Why important architectural decisions exist | Evaluating an architectural alternative | A durable architectural decision is made |

`docs/superpowers/` contains temporary design/specification/planning material. It supports implementation but is not a replacement for the canonical documents above.

## The most important product rules

- Learning is the primary purpose.
- It is a sandbox, not a guided tutor.
- Pre-created examples are important.
- There is no universal fixed UI; a Layer may replace the current experience.
- Components can have different numbers of meaningful representations.
- Higher layers do not recursively execute lower-layer simulations.
- Downward navigation requires an established lower representation.
- Upward navigation requires an established parent representation.
- Canonical foundations must remain recoverable.
- Physics and mathematics must remain meaningful.
- User-created components/models/layers are long-term goals.
- Cross-world relationships are possible future work, but their exact architecture is open.

## The most important engineering rules

- Keep visual/editor state separate from semantic model state.
- Keep the World Graph separate from the backend simulation model.
- Keep component definitions separate from instances.
- Keep topology semantic and independent of screen coordinates.
- Keep serializer boundaries explicit.
- Keep analysis separate from execution mode.
- Keep static and live runtime/result contracts distinct.
- Keep visualization downstream of simulation truth.
- Diagnose model → serializer → backend → transport → visualization → renderer → browser/CSS.
- Prefer deterministic contract/model tests before browser tests.
- Prefer stable semantic selectors and explicit graph-state assertions over brittle CSS/pixel assertions.
- Never report a change as successful from a partial validation run.

## Standard engineering loop

```text
Read canonical docs
      ↓
Inspect current code/tests/recent commits
      ↓
Identify boundary + invariant
      ↓
Implement smallest coherent change
      ↓
Add/update deterministic tests
      ↓
Build + deploy exact revision when required
      ↓
Run Worlds browser acceptance when UI behavior is affected
      ↓
Inspect artifacts/logs on failure
      ↓
Update canonical documentation if project truth changed
```

The self-hosted server is a worker, not a second source tree. GitHub remains authoritative.

## How to start a new engineering task

1. Read this file and the canonical documents relevant to the task.
2. Inspect the current branch, recent commits, and existing implementation.
3. Identify the architectural boundary involved.
4. Check existing tests and fixtures before changing behavior.
5. Make the smallest coherent change.
6. Add or update deterministic tests at the affected boundary.
7. Run the complete relevant validation pipeline.
8. Deploy the exact revision when deployment is part of the task.
9. Run the complete Worlds browser acceptance suite when the change affects the deployed application.
10. Diagnose any failure before reporting success.
11. Update `docs/CURRENT_STATUS.md` when the established project state or next-step priority changes.

## What not to assume

Do not assume the final UI of future Layers, the exact storage format for user-created Layers, the final cross-world architecture, or the exact depth of any component hierarchy. These are intentionally open until their requirements become concrete.

Do not turn today's Electrical World implementation into a universal template for every future World.

## Current implementation context

The current Worlds application already has explicit boundaries around the World Graph, serializer, simulation transport, static/live execution, visualization, and browser acceptance. Continue strengthening these foundations before adding speculative long-term features.
