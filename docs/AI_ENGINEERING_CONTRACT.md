# VilaPro Worlds — AI Engineering Contract

This document defines how an implementation agent should operate on Worlds. It is an engineering operating contract, not the product vision. Product vision will be documented separately after the architecture and engineering foundation are complete.

## 1. Human ↔ agent operating model

The preferred interaction is high-level:

```text
Human
  ↓
architecture / product intent / priorities / constraints
  ↓
AI engineering agent
  ↓
inspect → reason → implement → test → deploy → verify → diagnose
  ↓
Human receives a verified result
```

The human should not need to specify individual files, commands, test sequences, or implementation details unless they intentionally want to.

The agent is expected to discover the relevant implementation path, make coherent changes, run the appropriate validation, and continue fixing issues until the complete relevant validation pipeline is green.

## 2. Non-negotiable verification rule

Never report a change as working based on a partial run.

For a change that affects Worlds behavior, the agent must:

1. run relevant fast tests while developing;
2. run lint/build as applicable;
3. deploy the exact revision when deployment is part of the workflow;
4. run the complete Worlds browser acceptance suite;
5. inspect the final workflow result and relevant artifacts/logs;
6. only then report success.

If a test fails, the agent fixes the cause and reruns the complete relevant pipeline. Do not hide, skip, or weaken a failing test merely to obtain a green run.

## 3. Architecture-first reasoning

Before changing code, identify which architectural boundary owns the behavior.

Use this diagnostic order:

```text
World Graph
    ↓
Serializer
    ↓
Backend simulation
    ↓
Runtime transport
    ↓
Visualization model
    ↓
Renderer/layout
    ↓
Browser/CSS
```

Prefer fixing the earliest incorrect boundary rather than compensating for it downstream.

Example: if a wire is rendered incorrectly, first verify that its semantic endpoints are correct before changing SVG geometry or CSS.

## 4. Canonical source of truth

Use `ARCHITECTURE.md` for engineering boundaries.

Use `V04_Phases.md` for implementation roadmap and phase history.

Use `docs/WORKFLOW_OPTIMIZATION.md` for development-loop and CI behavior.

Do not create a competing architecture document for a local feature. Update the canonical document when a lasting architectural decision is made.

## 5. Data integrity rules

The World Graph is the canonical visual/editing model.

Topology is semantic. Position, routing, zoom, and styling are presentation state.

Do not:

- encode electrical meaning in screen coordinates;
- create hidden electrical connections only to make a drawing look correct;
- make ReactFlow structures the backend simulation model;
- make a renderer responsible for simulation semantics;
- duplicate component definitions unnecessarily in instances;
- silently discard malformed topology.

Prefer explicit validation at boundaries.

## 6. Change size and coupling

Make the smallest coherent change that satisfies the requirement.

Do not perform broad refactors merely because they are aesthetically appealing while solving a localized problem.

However, do not preserve known architectural coupling merely to minimize the immediate diff. If the current structure prevents reliable implementation, establish the required boundary and cover it with tests.

## 7. Tests as executable architecture

Every important invariant should have a deterministic test.

Use the cheapest test layer that can prove the behavior:

- pure unit/model tests for transformations and validation;
- contract tests for graph/serializer boundaries;
- backend tests for simulation semantics;
- Playwright for real user workflows;
- targeted visual checks for inherently visual behavior.

Do not use browser tests to prove something that can be proven deterministically without a browser.

## 8. Fixtures

Prefer canonical semantic fixtures for known circuits.

Fixtures should be independent of browser coordinates unless layout itself is the subject of the test.

When a bug is reproducible, consider adding a fixture so the same state can be tested repeatedly without recreating it through UI actions.

## 9. Failure handling

When a test fails, classify the failure before changing code.

Ask:

1. Is the graph wrong?
2. Is serialization wrong?
3. Is the backend result wrong?
4. Is runtime transport wrong?
5. Is result mapping wrong?
6. Is rendering/layout wrong?
7. Is browser/CSS behavior wrong?

Use logs, screenshots, traces, graph state, and fixtures as evidence.

Do not guess when the failing artifact can establish the actual state.

## 10. UI implementation rules

For important integration controls:

- prefer accessible roles and labels;
- use narrowly scoped stable test IDs where necessary;
- avoid selectors based on generic input types, generated class names, or incidental DOM structure;
- preserve direct manipulation as the primary Worlds interaction model.

The schematic is a primary surface, not merely a decorative preview.

## 11. Simulation rules

Keep these dimensions independent:

```text
Component
  × Layer
  × Analysis
  × Execution Mode
```

Static and Live are execution modes, not separate simulation architectures.

Do not create analysis-specific or layer-specific copies of the Live architecture when a shared runtime abstraction is appropriate.

Do not turn Live into a second static result format.

## 12. Product/engineering separation

Do not silently invent product direction while implementing engineering infrastructure.

If a decision is necessary and is architectural, choose the most extensible option consistent with the existing project direction and document it.

If a decision is fundamentally about product experience, preserve existing behavior where possible and flag it for the product-vision discussion unless the user has already expressed the intent clearly.

## 13. Autonomous implementation expectation

When the user says to continue, optimize, implement, fix, or proceed, the agent should:

- inspect the repository and existing architecture;
- identify the next highest-value engineering step;
- implement it;
- add appropriate tests;
- deploy/verify when required;
- continue through failures without requiring the user to coordinate the steps.

The agent should not repeatedly ask the user for low-level confirmation when the requested objective and architecture already provide enough information.

## 14. Completion definition

The engineering foundation is complete when:

- architecture boundaries are explicit;
- graph invariants are validated;
- important graph/serialization contracts are tested;
- deterministic fixtures exist for important circuits;
- simulation boundaries are validated;
- browser failures provide enough evidence for remote diagnosis;
- important visual regressions have deterministic checks;
- CI/deployment/acceptance validates the exact deployed revision;
- the complete relevant pipeline is green;
- routine implementation can be driven primarily by architecture, product intent, and priorities.

Only after this foundation is stable should the project spend significant effort on the final product-vision documentation.
