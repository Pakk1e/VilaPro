# Lab OS Concepts

This document defines the vocabulary used by Lab OS. It exists to prevent product vision, world structure, visual representation, and simulation implementation from becoming conflated.

## Universe

The Universe is the overall conceptual space of Lab OS. It contains Worlds and their relationships.

The Universe is a long-term concept. Current implementation work does not need to model the entire Universe.

## World

A World is a physical or conceptual domain with its own models, abstractions, simulations, and interaction patterns.

Examples:

- Electrical
- Thermal
- Mechanical
- Optical

A World is not synonymous with a screen or React application.

## Layer

A Layer is a meaningful abstraction or implementation level within a World.

Layers may differ substantially in UI, model, simulation, time scale, spatial scale, and interaction style.

A Layer is not necessarily "more realistic" than another layer. It is a different model of the system appropriate to a different level of understanding.

## View

A View is a way of presenting or interacting with a system or relationship without necessarily defining another abstraction layer.

Views are useful for future relationships between Worlds and for alternate representations of the same system.

## Component Definition

A Component Definition describes what a reusable component is independently of a particular placement.

It can include:

- identity/type
- ports
- parameter definitions
- defaults
- units
- model information
- available representations
- visibility/interaction metadata

## Component Instance

A Component Instance is an occurrence of a Component Definition in a particular model or workspace.

It has instance-specific state such as:

- stable instance identity
- position/layout
- orientation where applicable
- label
- parameter values
- connections

## Representation

A Representation is a component's meaningful form at a particular Layer.

For example, an AND gate may have:

```text
Logic representation
        ↓
Transistor representation
        ↓
Semiconductor representation
```

A component does not have to have representations at every possible Layer.

## Model

A Model describes the mathematical, physical, logical, or otherwise semantic behavior of a component or system at a particular abstraction.

The model is separate from its visual representation.

## Simulation

A Simulation executes a Model according to a selected analysis and execution mode and produces state/results.

A Layer can have its own simulation without executing simulations from lower layers.

## Foundation

A Foundation is a trusted, pre-created implementation supplied by Lab OS.

Foundations are intended to remain recoverable and protected from destructive learner changes.

## Experiment

An Experiment is a temporary or derived change to a foundation or model used to observe behavior and learn.

Experiments should be reversible to a useful degree.

## Parent Representation

A Parent Representation is an established representation at a higher abstraction level from which a learner entered the current representation.

Upward navigation is only meaningful when such a relationship exists.

A component created directly in a blank layer does not automatically acquire a parent representation.

## Lower Representation

A Lower Representation is an established representation at a deeper or otherwise lower abstraction level that can be entered from the current representation.

The existence of a lower representation is a property of the component/system definition, not something the UI should invent.

## Shared State

Shared State consists of parameters or context that have meaningful correspondence between related representations.

Not every parameter must be shared. The mapping should be explicit and semantically justified.

## World Graph

The World Graph is the canonical editable representation of a workspace at the current layer.

It contains semantic nodes and connections. Screen coordinates and renderer state are presentation concerns rather than the source of physical topology.

## Analysis

An Analysis describes what question the simulation is answering, such as DC, transient, or AC analysis.

Analysis is independent from execution mode.

## Execution Mode

Execution Mode describes how a simulation is run.

Current concepts are:

- Static: produce a complete result for a request.
- Live: maintain a runtime session and expose evolving state.

## Result

A Result is the data produced by a completed or sampled simulation, independent of how it is displayed.

## Visualization

Visualization converts model/result/runtime data into a layer-appropriate visual experience.

Visualization is not simulation and must not become the source of simulation truth.

## Key relationships

```text
Universe
  └── World
       └── Layer
            └── Representation
                 └── Component Definition
                      └── Component Instance
                           └── Model
                                └── Simulation
                                     └── Result / Runtime State
                                          └── Visualization
```

This is a conceptual relationship, not a requirement that every object be implemented as a nested class or database object.
