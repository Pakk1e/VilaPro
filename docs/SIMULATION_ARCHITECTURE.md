# Lab OS Simulation Architecture

## 1. Purpose

Simulation is the execution of a model at a particular World and Layer. It is deliberately separated from the visual editor and from the visualization of results.

## 2. Conceptual flow

```text
Layer-specific Model
        ↓
Simulation Configuration
        ↓
Analysis + Execution Mode
        ↓
Simulation Runtime
        ↓
Result / Runtime State
        ↓
Layer-specific Visualization
```

## 3. Analysis

Analysis describes what the simulation is solving or measuring.

Current electrical examples include:

- DC
- Transient
- AC

Additional analyses can be introduced without redefining the component itself.

## 4. Execution mode

Execution mode describes how the simulation runs.

### Static

A request is evaluated and a complete result is returned.

```text
Frontend
   ↓ request
Backend
   ↓
Complete result
   ↓
Dataset / series
   ↓
Visualization
```

### Live

A runtime session is established and evolving state can be sampled or streamed.

```text
Frontend
   ↓ start
Backend runtime session
   ↓
Live state / sampled signals
   ↓
Live visualization
```

Live execution must have its own lifecycle and sampling semantics. It should not be treated as a cosmetically different static result.

## 5. Layer independence

A simulation belongs to a layer-specific model.

Higher-level simulation should not recursively invoke lower-level simulation simply because a lower representation exists.

For example, an AND gate can be simulated as a logic component without executing a transistor simulation underneath it.

When the learner enters the transistor representation, a separate transistor simulation can be run.

## 6. Parameters and shared state

A simulation consumes parameters meaningful to its model.

When representations are related, selected parameters can be mapped between layers. The mapping must be explicit and semantically justified.

Not every parameter is shared.

## 7. Mathematical and physical models

The simulation model should represent the physics, mathematics, or logic appropriate to its abstraction.

Numerical methods are implementation mechanisms for solving a model. They are not themselves the definition of the component.

For example, a numerical integration method can be used for transient analysis without becoming part of the component's conceptual identity.

## 8. Transport boundary

Frontend transport should validate the shape of requests and results at the application boundary without duplicating backend physics semantics.

Conceptually:

```text
World Graph / Layer Model
        ↓
validated request
        ↓
backend model
        ↓
solver/runtime
        ↓
validated result/runtime state
        ↓
visualization model
```

Transport validation protects the boundary. The backend remains authoritative for domain semantics and numerical correctness.

## 9. Result model

Results should be represented independently of UI widgets.

Examples include:

- node voltages
- branch currents
- component results
- sampled signals
- time series
- simulation metadata

Visualization should transform these into layer-appropriate displays.

## 10. Inspection

The long-term learning experience should make it possible to understand why a result occurs.

Depending on the layer, inspection may eventually expose:

```text
Component
  ↓
Parameters
  ↓
Equations / model
  ↓
Numerical representation
  ↓
Simulation state
  ↓
Observed result
```

The exact depth exposed to the learner depends on the layer and should not force a universal UI.

## 11. Units and dimensional correctness

Physical quantities should eventually carry units and, where appropriate, dimensional information.

A model should be able to detect meaningful dimensional inconsistencies rather than treating every quantity as an untyped number.

This capability should support learning and correctness without unnecessarily obstructing experimentation.

## 12. Reset and canonical foundations

Foundational simulations/models must remain recoverable.

Experiments can change parameters or eventually create derived models, but the canonical implementation supplied by Lab OS remains available as a clean starting point.

## 13. Future simulation engines

Different Worlds and Layers may require different numerical methods, scales, or simulation engines.

The architecture should therefore avoid assuming that all simulations are electrical circuit solvers or that all results have the same shape.

Shared interfaces should express common lifecycle and transport concerns while allowing domain-specific simulation implementations.
