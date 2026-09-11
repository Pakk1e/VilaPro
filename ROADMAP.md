# Lab OS Roadmap

This roadmap describes direction and priorities rather than promising a fixed schedule. The project is exploratory and learning-focused, so later stages should be refined as the system and its educational value become clearer.

## 1. Roadmap principles

1. Build the engineering foundation before adding speculative complexity.
2. Keep visual representation separate from semantic models and simulation.
3. Build the Electrical World first.
4. Add depth only where a deeper representation has meaningful learning value.
5. Prefer physical and mathematical correctness over convenient but misleading behavior.
6. Preserve canonical foundations so experimentation is safe and reversible.
7. Do not force future Worlds into the electrical UI or simulation architecture.
8. Keep unresolved long-term design decisions explicitly open.

## 2. Current: Engineering foundation

### Goal

Make the existing Worlds workspace reliable enough to serve as the foundation for further experimentation.

### Work

- deterministic World Graph contracts
- component definition/instance separation
- topology and serialization validation
- simulation request/result transport validation
- deterministic model fixtures
- static and live simulation boundaries
- stable browser interaction boundaries
- failure diagnostics
- selective visual geometry verification
- exact deploy-to-acceptance verification
- repeatable AI-assisted engineering workflow

### Exit condition

The complete relevant test and deployment pipeline is consistently green, and failures can be diagnosed at the correct architectural boundary.

## 3. Current Electrical World: circuit sandbox

### Goal

Provide a useful basic circuit simulator that is enjoyable and practical for learning electronics.

### Direction

- schematic-first circuit building
- basic electrical components
- component properties
- wires and topology
- DC analysis
- transient analysis
- AC analysis
- live simulation
- oscilloscope and measurement-oriented visualization
- useful pre-created examples
- robust simulation controls

The existing EveryCircuit-like interaction is a reference for usability, not an implementation constraint.

## 4. Electrical component foundations

### Goal

Create a trustworthy foundation of basic components and models.

Potential progression:

```text
Sources
Resistors
Capacitors
Inductors
Diodes
Transistors
...
```

The exact order should follow learning value and implementation readiness.

Each component should receive deeper representations only where doing so is meaningful.

## 5. Deeper component exploration

### Goal

Introduce the first real abstraction transitions.

Example direction:

```text
Transistor
   ↓
Transistor implementation
   ↓
Semiconductor / physical model
```

A layer transition should replace the appropriate experience rather than simply adding more panels to the circuit UI.

Each layer can have an independent simulation.

## 6. Digital logic

### Goal

Extend the Electrical World into digital abstraction.

Potential progression:

```text
Logic gates
   ↓
Combinational logic
   ↓
Sequential logic
   ↓
Registers
   ↓
ALU
   ↓
CPU
```

The learner should be able to explore a higher-level object and, where an established implementation exists, descend into the lower representation.

## 7. Computer-system exploration

### Goal

Use the same abstraction philosophy to make increasingly complex systems explorable.

Possible examples:

- ALU
- memory
- registers
- buses
- CPU
- simple computer systems

These are examples of direction, not a commitment to a fixed implementation sequence.

## 8. Experimentation system

### Goal

Make changing parameters and observing consequences a first-class learning workflow.

Potential capabilities:

- change component parameters
- run/re-run simulation
- inspect results
- compare selected experiments
- reset to canonical foundation
- create derived component/model experiments

Do not build a heavyweight version-control system unless future use proves it necessary.

## 9. User-created components

### Goal

Allow learners to move from using foundations to creating their own components.

Potential progression:

```text
Build / define something
       ↓
Give it a model
       ↓
Create reusable component
       ↓
Experiment
       ↓
Optionally create lower representation
```

Validation should ensure that models are meaningful rather than silently accepting invalid physics or mathematics.

## 10. Mathematical and physical modeling

### Goal

Make the mathematics behind components progressively inspectable.

Potential capabilities:

- equations
- typed quantities
- units
- dimensional validation
- model inspection
- model experimentation
- accurate numerical representations

The foundational model remains protected and recoverable.

## 11. Additional Worlds

Potential future Worlds include:

- Thermal
- Mechanical
- Optical
- Control
- Fluid
- others discovered to be useful

These should be added when there is a meaningful learning experience to build, not merely because the architecture permits them.

Each World may define its own hierarchy and UI.

## 12. Cross-world relationships

Later exploration may connect Worlds.

For example:

```text
Electrical motor
      ↓
Mechanical motion
      ↓
Mechanical load
```

Whether this is represented as linked Worlds, Views, coupled simulations, or another mechanism is intentionally undecided.

## 13. User-created layers and representations

Long-term direction includes allowing users to define deeper representations for components they create.

This is a major capability and should be introduced only after the foundational component/model architecture is mature enough to validate user-created mathematics and physics.

## 14. What is deliberately not scheduled

The following should remain open until their prerequisites are understood:

- exact layer storage format
- universal component-definition format
- user-facing equation editor
- cross-world simulation architecture
- exact multi-world navigation
- advanced semiconductor simulation depth
- arbitrary user-defined physics
- comprehensive educational guidance/tutoring

The absence of a date is intentional. These are architectural/product discovery areas rather than commitments.
