# Lab OS Decisions

This document records decisions that should not be rediscovered in future sessions unless deliberately revisited.

## D1 — Learning is the primary purpose

Lab OS is a personal, learning-oriented project. It is not being designed around commercialization.

## D2 — Sandbox, not tutor

The default experience is an open sandbox with useful pre-created examples. The system should not constantly guide the learner through a prescribed lesson.

## D3 — UI is Layer-specific

There is no fixed universal UI. A Layer may replace the current workspace and use an interaction model appropriate to its abstraction.

## D4 — Layers are meaningful, not uniform

Different components can have different numbers of meaningful representations. Do not create artificial depth merely for consistency.

## D5 — Higher layers do not recursively simulate lower layers

A higher-level simulation uses its own model. A lower representation is explored separately when the learner chooses to enter it.

## D6 — Navigation is relationship-based

Downward navigation requires an established lower representation. Upward navigation requires an established parent representation. The system must not fabricate relationships.

## D7 — Canonical foundations are recoverable

Foundational components/models supplied by Lab OS remain available as a clean reference. Learner experimentation must not destroy the canonical implementation.

## D8 — Accuracy wins

Physical and mathematical correctness is more important than convenient but misleading simplification. Complexity should still be presented at the level appropriate to the learner.

## D9 — Common state can cross representations

Parameters with meaningful correspondence may be preserved across related Layers during a session. The mapping is explicit; arbitrary state is not automatically shared.

## D10 — Mathematics should eventually be inspectable

Equations, quantities, units, dimensional relationships, and numerical models should be capable of being exposed as part of deeper learning experiences.

## D11 — User-created components are a long-term goal

Learners may eventually create components, define models, and create lower representations. This requires strong model validation before becoming a core feature.

## D12 — Cross-world relationships remain open

Electrical, Mechanical, Thermal, Optical, and other Worlds may eventually interact. The exact mechanism—linked views, coupled simulations, or another model—is intentionally undecided.

## D13 — World Graph is not universal truth

The current World Graph is the canonical editable representation of the current workspace/layer. It is not the definition of the entire Lab OS Universe.

## D14 — Renderer is not simulation truth

Rendering, layout, zoom, and visual routing must not silently change semantic topology or simulation meaning.

## D15 — Static and Live are execution modes

Analysis and execution mode are separate dimensions. Static and Live should share appropriate infrastructure without becoming the same result format.

## D16 — EveryCircuit is a UX reference, not a dependency

EveryCircuit is useful as inspiration for circuit-simulator interaction principles. Lab OS does not need to reproduce its implementation, branding, or exact UI.

## D17 — Do not over-design the future

Unknown future details should remain explicitly open. Current architecture should avoid obvious dead ends without prematurely implementing speculative capabilities.
