# Lab OS Layer Model

## 1. Purpose

Layers allow a learner to explore a system at different meaningful abstractions without requiring one universal UI or one recursive simulation to represent everything.

## 2. Layer-specific experience

A Layer owns the experience appropriate to its abstraction.

That can include:

- UI structure
- tools
- interaction model
- visual representation
- model semantics
- simulation approach
- units and scales
- inspection capabilities

Entering another layer may therefore replace the current workspace UI completely.

The architecture must not assume that the circuit editor is the UI for every future layer.

## 3. Independent simulations

Each layer can have its own simulation.

A higher-level simulation should not automatically run lower-level simulations underneath it.

Example:

```text
Logic Layer
  AND gate
     ↓
  logic simulation

Transistor Layer
  transistor network
     ↓
  transistor simulation
```

The relationship between these layers is semantic and representational. Recursive execution is not required.

## 4. Variable and parameter continuity

When moving between related representations, parameters with a meaningful correspondence may be carried through the session.

For example, a transistor's physical dimensions may remain available when moving between an appropriate circuit representation and a deeper representation.

This does not mean that every variable is shared. Each layer decides which quantities are meaningful and how they map.

## 5. Navigation

### Downward

A learner can move downward when an established lower representation exists.

```text
AND gate
   ↓
transistor implementation
```

The system must not invent a deeper implementation merely because a navigation control would be convenient.

### Upward

A learner can move upward when the current representation has an established parent representation.

```text
AND gate
   ↓
transistor implementation
   ↑
AND gate
```

If a learner starts in a blank circuit layer and creates a transistor directly, there is no implied higher-level parent. Upward navigation should therefore be unavailable unless a real relationship has been defined.

## 6. Variable depth

Layer depth is component-specific.

There is no requirement that all components have the same number of layers.

Example:

```text
Resistor
  └── physical representation

Transistor
  ├── circuit representation
  ├── transistor implementation
  └── semiconductor representation
```

Depth should be justified by learning value and physical/mathematical meaning.

## 7. Foundations

Foundational representations supplied by Lab OS are canonical.

A learner may experiment with them, but the original implementation must remain recoverable.

A lower-layer experiment must not silently replace the canonical foundation.

## 8. User-created representations

The long-term system may allow users to create new components and define representations at deeper levels.

A possible lifecycle is:

```text
Create component
      ↓
Define current-layer model
      ↓
Use / experiment
      ↓
Optionally create lower representation
```

A user-created component can exist without a lower representation and without an upward representation.

## 9. Physics and mathematics

A representation is valid only to the extent that its model makes physical and mathematical sense for the selected abstraction.

Validation should be able to reject or clearly mark invalid models when appropriate.

The system should not sacrifice correctness merely to preserve a visual hierarchy.

## 10. Layer-specific UI contract

The shared platform should provide infrastructure, not force a common UI.

Shared infrastructure may include:

- navigation/session context
- component identity
- representation metadata
- parameter/state mappings
- simulation transport
- persistence
- validation

The actual layer experience may be completely different.

## 11. Current implementation implication

The existing electrical schematic workspace is one layer experience. Its World Graph, renderer, simulation controls, and oscilloscope should not be treated as the universal architecture for all future Worlds or Layers.

Future layer implementations should be able to use different model and presentation structures while still participating in the shared Lab OS concepts.
