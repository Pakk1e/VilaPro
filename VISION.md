# Lab OS Vision

## 1. Purpose

Lab OS is a learning-oriented interactive sandbox for exploring how systems work by building, simulating, inspecting, and experimenting with them at different levels of abstraction.

The primary purpose is learning. Lab OS is not being designed around commercialization, a business model, or a fixed product-market objective.

The learner should be able to explore freely rather than being forced through a lesson plan. The system provides capable tools and well-designed examples; the learner decides what to investigate.

## 2. The central idea

The defining idea of Lab OS is **exploration across abstraction levels**.

A system can be understood at one level and then explored at a deeper level when a meaningful implementation exists.

For example:

```text
AND gate
   ↓
transistor implementation
   ↓
semiconductor / physical implementation
   ↓
...
```

The purpose of moving downward is not simply to make a simulation more detailed. It is to understand how the thing works and what its behavior means at another abstraction.

Different components can have different numbers of meaningful levels. A resistor does not need an artificially deep hierarchy merely because another component, such as a transistor, benefits from one.

## 3. Worlds

Lab OS is conceived as a universe containing different physical or conceptual worlds.

Examples include:

- Electrical
- Thermal
- Mechanical
- Optical
- and potentially others

Each world can have its own hierarchy, models, simulations, visualizations, and interaction patterns.

The current priority is learning electronics. Other worlds are part of the long-term direction, not a requirement to force into the current implementation.

## 4. Layers are independent experiences

A layer is not merely a configuration switch on one universal interface.

The appropriate UI/UX for one layer may make little sense in another. Therefore, entering another layer may replace the current workspace entirely.

Each layer can have its own:

- UI and interaction model
- visual representation
- simulation model
- simulation engine or numerical approach
- time and spatial scale
- units and quantities where appropriate
- tools for inspection and experimentation

The underlying architecture must make this possible without forcing every future layer into the current circuit-editor implementation.

## 5. Independent simulation by layer

For simplicity and scalability, higher-level simulations should not automatically execute lower-level simulations underneath them.

An AND gate simulation should simulate the AND gate at the logic abstraction. It should not simulate individual electrons every time the logic simulation runs.

Instead:

```text
Logic layer
    ↓
AND gate simulation
```

and, when the learner chooses to explore its implementation:

```text
Transistor layer
    ↓
transistor-level simulation
```

These are separate simulations connected conceptually through representations and shared meaningful parameters, not through mandatory recursive execution.

## 6. Components and representations

A component has a definition and can have one or more meaningful representations at different layers.

A foundational component may look like:

```text
AND gate
 ├── Logic representation
 ├── Transistor representation
 └── Semiconductor representation
```

But not every component needs this depth.

A component may also exist at a layer without having a representation that leads upward. For example, a transistor placed directly into a blank circuit layer does not automatically imply that the circuit belongs to a higher-level component.

Moving downward is possible when a deeper representation exists. Moving back upward is possible when the current object has a known parent representation. Upward navigation should not be fabricated merely because the system can imagine one.

## 7. State shared between layers

Some parameters and session context should survive a transition between related layers when they have a meaningful correspondence.

For example, a transistor may have circuit-level parameters such as physical dimensions. The higher-level simulation can use the appropriate model for those parameters without requiring the lower-level simulation to run.

The exact set of shared variables is a future design decision, but the architecture must not prevent common state from being preserved across layer transitions.

## 8. Foundations and experimentation

Lab OS should provide trusted, pre-created foundations:

- basic components
- meaningful component representations
- canonical mathematical/physical models
- example circuits and systems

The learner can experiment with parameters and behavior without destroying the canonical foundation.

The foundational implementation should remain recoverable and effectively immutable from the learner's perspective. Experiments can be reset to the original implementation.

This creates a safe loop:

```text
Canonical foundation
        ↓
     experiment
        ↓
      observe
        ↓
     understand
        ↓
 reset / experiment again
```

## 9. Physics and mathematics must remain meaningful

Lab OS should not accept arbitrary behavior merely because it is visually convenient.

Models should remain consistent with the physics and mathematics appropriate to their abstraction.

Accuracy is preferred over superficial simplicity.

At the same time, Lab OS should not expose unnecessary complexity when that complexity does not help the learner understand the current level.

The principle is:

> Be as physically and mathematically accurate as the current abstraction warrants, while presenting that model in a way appropriate to the abstraction.

## 10. Mathematics as a first-class concept

Mathematical models should eventually be inspectable and understandable.

A component may expose:

```text
Resistor

Parameter
  R = 1 kΩ

Model
  V = I × R
```

The foundational model should be trusted and protected. Experimentation can eventually extend beyond changing parameters into user-created models, but this should not compromise the canonical implementation.

Equations, variables, units, dimensions, and numerical models are therefore potential first-class parts of the system rather than hidden implementation details.

## 11. Experimentation

Experimentation is central to the learning experience.

The basic loop is:

```text
Change something
      ↓
Simulate
      ↓
Observe
      ↓
Compare / reason
      ↓
Change something else
```

Examples include changing a resistor value, transistor dimensions, a source waveform, or another physically meaningful parameter and observing the resulting behavior.

Experiments should be reversible to a useful degree, but Lab OS does not need to become a full version-control system for every learner action.

## 12. Sandbox rather than tutor

Lab OS should primarily be a sandbox.

It should not constantly tell the learner what to do next or turn the experience into a guided course.

Instead, it should provide high-quality pre-created examples that demonstrate what can be explored.

Examples may include:

- basic circuits
- dynamic circuits
- transistor circuits
- logic gates
- sequential logic
- progressively more complex systems

The learner can open an example, inspect it, modify it, and use it as a starting point for exploration.

Educational explanations can exist as supporting capabilities in the future, but the default experience should remain an open sandbox.

## 13. User-created components

The long-term vision allows learners to create new components rather than only using the components supplied by Lab OS.

A possible future workflow is:

```text
Compose or define something
        ↓
Define its behavior/model
        ↓
Create a reusable component
        ↓
Optionally define a deeper representation
        ↓
Use it in larger systems
```

A user-created component does not need to have a deeper representation immediately. It can exist with a valid model at its current layer and acquire further representations later.

A user-created object may also exist without a valid simulation until its mathematical/physical model is sufficiently defined.

The system should support validation rather than silently treating arbitrary constructions as physically meaningful.

## 14. Units and dimensional correctness

Physical quantities should eventually be represented with meaningful units rather than being treated as unrelated numbers.

The system should be capable of detecting mathematical or dimensional inconsistencies where the selected abstraction and model make that meaningful.

This should support learning rather than become an obstacle for its own sake.

## 15. Views and cross-world relationships

Not every relationship should be forced into the layer hierarchy.

Some future systems may connect different physical worlds or provide another view of the same system.

For example:

```text
Electrical motor
      ↓
Mechanical motion
      ↓
Mechanical load
```

This may be better represented through linked views or world relationships than by pretending the mechanical system is simply another electrical layer.

Cross-world simulation is a future possibility, not a current requirement.

## 16. The learning principle

Every major design decision should be evaluated against one question:

> **Does this help someone understand how the system works?**

Power without understanding is not the objective.

Simplification is acceptable when it represents an appropriate abstraction and remains honest about what is being modeled. Complexity is justified when it reveals something meaningful to the learner.

## 17. What Lab OS should not become

Lab OS should not become:

- a commercial product optimized for monetization
- a fixed UI trying to represent every possible physical domain
- a collection of unrelated component forms
- a black-box simulator that hides why things behave as they do
- a system that pretends arbitrary mathematics is valid physics
- a mandatory course that dictates a single learning path
- a requirement that every component have the same depth of hierarchy
- a requirement that higher-level simulations recursively execute lower-level physics

## 18. Architectural implication

The vision requires a strong separation between:

```text
World
  ↓
Layer
  ↓
Component definition / representation
  ↓
Model
  ↓
Simulation
  ↓
Result / state
  ↓
Layer-specific experience
```

The visual editor currently being built is one experience for one class of layer. It must not become the definition of Lab OS itself.

The architecture should therefore preserve independent model, simulation, transport, and presentation boundaries so that future layers can replace the experience without rewriting the underlying foundation.

## 19. Scope of certainty

The core direction is intentionally defined, but many future details are not.

Open questions include:

- the exact representation format for layers
- how users author mathematical models
- how validation is exposed to learners
- how cross-world relationships are represented
- the exact mechanism for user-created components
- which components deserve deeper representations
- the exact UI of future layers

These should be discovered and designed when their corresponding capabilities become real requirements. The vision should guide those decisions without pretending they have already been solved.
