# Lab OS — Start Here

This is the first document an AI engineering session should read when continuing Lab OS work.

## Project in one paragraph

Lab OS is a learning-oriented interactive sandbox for exploring how systems work by building, simulating, inspecting, and experimenting with them at different levels of abstraction. The current focus is the Electrical World and a useful circuit simulator. The long-term direction is a Universe containing different Worlds, where each World can have its own meaningful hierarchy of Layers, models, simulations, visualizations, and UI.

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
- Use targeted visual checks rather than broad fragile screenshot comparisons.
- Never report a change as successful from a partial validation run.

## Canonical documents

Read these before making architectural changes:

1. `VISION.md` — product/learning vision.
2. `docs/CONCEPTS.md` — canonical terminology.
3. `docs/LAYER_MODEL.md` — abstraction and navigation rules.
4. `docs/WORLDS.md` — World-level direction.
5. `ARCHITECTURE.md` — current engineering boundaries.
6. `docs/SIMULATION_ARCHITECTURE.md` — simulation boundaries.
7. `ROADMAP.md` — current strategic direction.
8. `docs/DECISIONS.md` — decisions already made.
9. `docs/CURRENT_STATUS.md` — current implementation/handoff state.
10. `docs/AI_ENGINEERING_CONTRACT.md` — AI engineering operating contract.
11. `docs/WORKFLOW_OPTIMIZATION.md` — development workflow optimization.
12. `V04_Phases.md` — detailed historical/implementation phase roadmap.

## How to start a new engineering task

1. Read `docs/START_HERE.md` and the relevant canonical documents.
2. Inspect the current branch, recent commits, and existing implementation.
3. Identify the architectural boundary involved.
4. Check existing tests and fixtures before changing behavior.
5. Make the smallest coherent change.
6. Add or update deterministic tests at the affected boundary.
7. Run the complete relevant validation pipeline.
8. Deploy the exact revision when deployment is part of the task.
9. Run the complete Worlds browser acceptance suite when the change affects the deployed application.
10. Diagnose any failure before reporting success.

## What not to assume

Do not assume the final UI of future Layers, the exact storage format for user-created Layers, the final cross-world architecture, or the exact depth of any component hierarchy. These are intentionally open until their requirements become concrete.

Do not turn today's Electrical World implementation into a universal template for every future World.

## Current implementation context

The current Worlds application already has explicit boundaries around the World Graph, serializer, simulation transport, static/live execution, visualization, and browser acceptance. Continue strengthening these foundations before adding speculative long-term features.
