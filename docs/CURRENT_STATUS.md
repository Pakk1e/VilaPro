# Lab OS Current Status

## Purpose

This document is the handoff point for future development sessions. It describes the current engineering direction and what should be considered established before starting new work.

## Current project direction

Lab OS is a learning-focused interactive sandbox. The current implementation is the Electrical World and its circuit simulation workspace.

The long-term architecture supports multiple Worlds and multiple meaningful abstraction Layers. A future Layer may replace the current UI entirely and may use an independent simulation model.

## Established engineering foundation

The Worlds workspace currently has explicit boundaries between:

- visual/editor state
- canonical World Graph
- graph serialization
- backend simulation model
- simulation execution
- runtime transport
- result/visualization model
- renderer/layout
- explicit World/Layer/Representation session context

The current World Graph and public simulation transport boundaries have runtime validation and deterministic tests. Backend domain/model validation remains authoritative for physics, component semantics, and numerical correctness.

The frontend supports both static and live simulation concepts. The live workspace includes oscilloscope-oriented visualization for sampled signals.

The current Electrical workspace carries an explicit, minimal context identity (`universeId`, `worldId`, `layerId`, `representationId`) without coupling that context to the World Graph or changing the Electrical simulation model. This is an extension point for future Worlds/Layers, not a multi-world implementation.

The Electrical workspace also has deterministic pre-created examples represented as editable World Graph templates. Current examples are Voltage divider, RC low-pass, Parallel resistors, RL transient, and RLC transient. Examples are graph templates, not separate simulation engines; they exercise the same editor, serializer, backend, and analysis paths as user-built circuits.

Browser acceptance uses stable interaction boundaries and failure diagnostics. Deployment acceptance verifies the exact deployed revision.

## Important architectural rules

1. Do not make the renderer the source of physical/simulation truth.
2. Do not make ReactFlow/editor structures the backend simulation model.
3. Keep topology semantic; screen coordinates are presentation.
4. Keep component definitions separate from component instances.
5. Keep analysis separate from execution mode.
6. Keep static and live result/runtime boundaries explicit.
7. Keep World/Layer context separate from domain graph semantics.
8. Validate boundaries with useful errors.
9. Prefer deterministic model fixtures over browser-only setup.
10. Use targeted visual checks rather than broad fragile screenshots.
11. Diagnose from model → serializer → backend → transport → visualization → renderer → browser/CSS.
12. Run the complete relevant test/deploy/acceptance pipeline before reporting a change as successful.

## Product/vision rules

1. The primary purpose is learning electronics.
2. The default experience is a sandbox, not a tutor.
3. Pre-created examples are important.
4. UI/UX is Layer-specific; there is no requirement for one universal UI.
5. Higher-level simulations do not recursively simulate lower levels.
6. Components can have different numbers of meaningful representations.
7. Downward navigation requires an established lower representation.
8. Upward navigation requires an established parent representation.
9. Canonical foundations remain recoverable after experimentation.
10. Physics and mathematics should remain meaningful.
11. User-created components and representations are long-term goals.
12. Cross-world relationships may eventually exist, but their exact architecture is intentionally undecided.

## Immediate engineering priority

The minimal World/Layer extension point is established without speculative multi-world behavior. Continue strengthening the engineering foundation only where it provides a concrete benefit to the current Electrical World, then continue the Electrical World implementation.

Current useful next areas are:

- finish and validate the pre-created Electrical example set against the real backend where useful
- improve example metadata/foundation semantics without turning examples into a separate simulation path
- strengthen safe, bounded browser failure diagnostics
- add selective geometry assertions for known layout regressions
- improve architectural-boundary test reporting
- complete-loop measurement after foundation changes
- continue Electrical World implementation
- later, when requirements become concrete, real navigation between established Layers

Do not invent a speculative multi-world registry, persistent user-layer system, or cross-world architecture merely to fill an extension point.

Before starting a new feature, inspect `VISION.md`, `docs/CONCEPTS.md`, `docs/LAYER_MODEL.md`, `ARCHITECTURE.md`, and `ROADMAP.md`.

## Latest handoff point

The latest implementation work added the RLC transient pre-created example and deterministic coverage for its resistor/inductor/capacitor topology and initial-state parameters. The last committed revision at handoff is `c087322dc90f71ca5adf399e9f372295e51a890c`. CI and Worlds deployment workflows were triggered for that revision; a new session must verify their final state and, if deployment succeeded, verify the complete browser acceptance suite against the exact deployed revision before treating the change as complete.

## Future-session handoff

A new engineering session should begin by:

1. reading this document and the canonical vision/architecture documents
2. inspecting the current branch and recent commits
3. verifying the final CI/deployment state for the latest revision before making assumptions
4. checking existing tests before changing behavior
5. identifying the architectural boundary affected by the task
6. implementing the smallest coherent change
7. running the complete relevant validation/deployment/acceptance loop
8. only then reporting completion
