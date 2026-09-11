# Lab OS Worlds

## 1. Purpose

A World is a physical or conceptual domain with its own hierarchy, models, simulations, visualizations, and interaction patterns.

The Universe may eventually contain many Worlds, but current development is focused on the Electrical World and should not be burdened by speculative implementations for every future domain.

## 2. Initial direction

The long-term set of Worlds may include:

```text
Electrical
Thermal
Mechanical
Optical
Control
Fluid
...
```

This is directional, not a commitment to a fixed list.

## 3. Independent World experiences

A World can provide its own:

- layer hierarchy
- component definitions
- models
- simulations
- units and quantities
- visualization
- interaction patterns
- examples

There is no requirement that a Mechanical World look or behave like the Electrical schematic workspace.

## 4. World and Layer

Each World has its own hierarchy.

For example:

```text
Electrical World
  ├── Circuit
  ├── Digital Logic
  ├── Transistor
  └── Semiconductor
```

The exact hierarchy is a domain design decision. Different Worlds may use entirely different structures.

## 5. Cross-world relationships

Future systems may involve multiple Worlds.

For example:

```text
Electrical motor
      ↓
Mechanical motion
      ↓
Mechanical load
```

Such a relationship may be better represented as linked Views or World relationships than by pretending the mechanical system is simply another electrical Layer.

The final representation is intentionally undecided.

## 6. Current scope

Current work should prioritize the Electrical World and the architecture required to support meaningful electronics learning.

Other Worlds should influence architectural boundaries only where doing so prevents a clear future dead end.

They should not drive premature implementation complexity.

## 7. World-specific UI

The UI is part of the World/Layer experience.

A common shell may exist where useful, but the system must not require a single fixed UI across all Worlds.

A semiconductor experience may need tools and visualizations that would make no sense in a circuit editor. A mechanical simulation may require an entirely different interaction model.

## 8. Shared platform infrastructure

The platform can eventually provide shared capabilities such as:

- identity
- persistence
- session context
- navigation between established representations
- parameter/state mappings
- model validation
- simulation lifecycle
- result storage

These should remain infrastructure rather than forcing every World to share domain-specific semantics.
