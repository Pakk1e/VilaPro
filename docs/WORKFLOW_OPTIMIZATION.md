# Workflow Optimization

This document defines the engineering workflow for the Worlds development loop. The goal is not only lower feedback time, but a development system that makes changes safer, more deterministic, easier to diagnose, and easier for an AI coding agent to reason about.

The optimization work is intentionally separated from Worlds application behavior. It may change GitHub Actions workflows, deployment scripts used only for Worlds DEV, runner/tooling configuration, test infrastructure, and engineering documentation. The production `deploy.sh` remains untouched.

## Optimization principles

1. **Measure before optimizing.** Record step-level durations and runner resource usage instead of guessing.
2. **Do not weaken validation.** The final acceptance gate must run the complete suite and require every test to pass.
3. **Remove duplicated work first.** Deployment and acceptance should each do only the work needed for their role.
4. **Keep deployment deterministic.** Persistent caches/tooling must not allow stale dependencies or browsers to silently change the tested revision.
5. **Serialize deployment and acceptance.** Acceptance must validate the revision that was actually deployed and only start after a successful deployment/health check.
6. **Use parallelism only when measured runner capacity supports it.** More Playwright workers are not automatically faster.
7. **Optimize for diagnosis as well as execution time.** A fast failure with poor evidence is less useful than a slightly slower failure with enough information to fix it immediately.
8. **Keep architecture explicit.** Repeatedly inferred architecture is a source of accidental coupling and regression.
9. **Prefer deterministic contracts over browser-only verification.** Pure graph/model invariants should be tested without a browser whenever possible.
10. **Keep production deployment untouched.** `deploy.sh` remains outside this scope.

## Target loop

```text
change
  ↓
contract/model validation
  ↓
frontend build
  ↓
DEV deployment
  ↓
health check
  ↓
complete browser acceptance
  ↓
artifacts + diagnosis
  ↓
report only after all relevant checks are green
```

## Phases

### W1 — Baseline measurement

Instrument the Worlds DEV deployment and acceptance workflows so expensive steps report duration and, where practical, runner resource characteristics.

**Exit condition:** one complete deployment + acceptance cycle has a timing baseline.

### W2 — Remove duplicated validation from deployment

The Worlds DEV deployment script is responsible for deploying a known revision, starting/restarting Worlds services, building what deployment requires, and performing health checks. CI/browser acceptance owns browser validation.

**Exit condition:** deployment no longer repeats CI-only validation without a specific reason.

### W3 — Persistent browser tooling and dependency cache

- Keep npm download caching enabled through `setup-node`.
- Reuse Playwright installation safely on the persistent runner.
- Reuse Chromium when the required browser revision is present.
- Keep dependency installation deterministic.

**Exit condition:** repeated runs reuse safe cached resources.

### W4 — Acceptance execution

The acceptance workflow is the authoritative browser gate.

- Run the entire suite.
- Do not stop after the first failure.
- Keep retries at zero unless a specific investigation proves retries are necessary.
- Tune workers using measured runner capacity.
- Preserve useful artifacts.

**Exit condition:** one acceptance run reports the complete suite.

### W5 — Deployment → acceptance contract

```text
CI/deploy revision
   ↓
Deploy exact revision
   ↓
Health checks
   ↓
Acceptance exact deployed revision
```

Acceptance must not accidentally test another checkout because another push arrived while the runner was busy.

**Exit condition:** acceptance identifies the deployed revision under test.

### W6 — Resource-aware parallelism

Test controlled Playwright parallelism and compare execution time, CPU, memory, and stability. Keep the smallest worker count that gives good throughput.

**Exit condition:** worker count is evidence-based.

### W7 — Re-measure and document

Compare representative changes against the baseline and record deployment, acceptance, setup, browser execution, total feedback, and diagnosis time.

**Exit condition:** optimization has a measured benefit without weakening validation.

### W8 — Architecture source of truth

Create and maintain `ARCHITECTURE.md` as the engineering source of truth for Worlds boundaries.

It defines:

- component definition vs instance
- canonical World Graph
- connection/topology semantics
- serializer boundary
- backend simulation boundary
- analysis vs execution mode
- static result vs live runtime state
- renderer responsibilities/non-responsibilities
- debugging order
- testing layers
- long-term multi-layer direction

**Exit condition:** a new contributor or coding agent can determine where a change belongs without relying on conversation history.

### W9 — Deterministic model contracts and fixtures

Build a fast contract-test layer around the World Graph and serializer.

Canonical fixtures represent semantic circuits such as:

- series circuit
- voltage divider
- sine source
- RC circuit
- AC circuit
- current-source circuit
- parallel-resistor/junction circuit

Contract tests cover:

- valid topology
- invalid endpoints
- missing/unconnected terminals
- source waveform serialization
- deterministic serialization
- component type mapping
- junction connectivity
- graph schema validation

**Exit condition:** important graph/serialization regressions are caught without a browser.

### W10 — Stable browser interaction boundaries

Prefer accessible roles/labels. Add narrowly scoped `data-testid` selectors at stable integration boundaries only.

Current boundaries include the canvas, component palette, component inspector, simulation panel, simulation setup, and primary simulation action.

**Exit condition:** acceptance tests do not need fragile CSS or generic input selectors for important controls.

### W11 — Failure diagnostics

On acceptance failure, preserve richer diagnostic evidence where practical:

- screenshot
- Playwright trace
- console/page errors
- URL
- viewport/zoom
- selected node
- graph/fixture context

Success artifacts should remain lightweight. Failure artifacts should maximize diagnostic value.

**Exit condition:** common UI failures can be classified as graph, serializer, backend, transport, visualization, renderer/layout, or browser/CSS failures from one run.

### W12 — Runtime/schema validation

Introduce explicit validation at important data boundaries:

```text
Editor
  ↓
WorldGraph validation
  ↓
Simulation request validation
  ↓
Backend simulation model
  ↓
Result/runtime-state validation
```

The frontend now validates the World Graph and the public simulation request/response/live-snapshot transport shapes. Backend domain/model validation remains authoritative for physics, component semantics, and numerical correctness; the frontend must not duplicate those domain rules.

Errors should identify the affected component, port, parameter, or boundary.

**Exit condition:** malformed cross-layer data fails close to its source instead of becoming a distant UI symptom.

### W13 — Visual regression where it has high value

Use screenshot/geometry assertions selectively for behavior that is inherently visual:

- component insertion and viewport behavior
- palette overlap
- wire-to-port alignment
- simulation workspace layout
- oscilloscope readability

Do not turn every browser test into a screenshot test.

**Exit condition:** important visual regressions have deterministic signals without excessive artifact noise.

### W14 — AI-effective development loop

The project should make it possible to work from high-level architecture, product intent, and priorities while the implementation agent handles the mechanics.

Required properties:

- architecture is explicit
- invariants are testable
- fixtures reproduce known states
- tests identify the violated boundary
- failures contain enough evidence to diagnose remotely
- changes are validated end-to-end before being reported
- product vision is separated from implementation details
- future architecture remains explicitly open where product decisions have not been made

The intended interaction is:

```text
Human
  ↓
architecture / product intent / priorities
  ↓
AI implementation agent
  ↓
inspect → design → implement → test → deploy → accept → diagnose
  ↓
Human receives verified result
```

The human should not need to manually coordinate every implementation step.

**Exit condition:** routine implementation, testing, deployment, and diagnosis can be handled without requiring the user to provide low-level instructions.

## Current implementation status

- W1 measurement: implemented and retained in deployment/acceptance logs.
- W2 duplicate deployment validation: implemented for the Worlds DEV path.
- W3 persistent Playwright tooling: implemented on the `worlds-dev` runner; Chromium remains idempotently ensured.
- W4 complete acceptance: implemented with zero retries and no early-failure limit.
- W5 deployment/acceptance contract: implemented; acceptance checks out the exact deployed revision passed by the deployment workflow.
- W6 worker tuning: 3 workers retained based on measured runner performance; 4 workers did not provide a meaningful improvement.
- W7 measurement: ongoing; do not claim a benchmark unless the run was actually observed.
- W8 architecture source of truth: implemented in `ARCHITECTURE.md`.
- W9 deterministic fixtures/contracts: implemented with canonical circuit fixtures and serializer/model contract coverage, including junction and current-source cases.
- W10 stable browser boundaries: initial canvas/palette/inspector/simulation selectors implemented and acceptance tests updated.
- W11 failure diagnostics: trace-on-failure, graph-state context, console/page errors, and richer failure artifact retention implemented.
- W12 runtime/schema validation: **implemented for the current public boundaries** through `worldGraphSchema.js`, serializer integration, and `simulationTransport.js`; backend remains authoritative for domain/model validation.
- W13 selective visual regression: initial placement/palette-overlap protection exists; targeted visual assertions remain to be expanded only where they add deterministic value.
- W14 AI-effective development loop: foundation is implemented; final completion requires the remaining validation/diagnostic work and a stable operating process.

## Priority after the current foundation work

1. Strengthen browser failure diagnostics with safe, bounded state capture.
2. Add selective visual geometry assertions for known layout regressions.
3. Improve static/model test reporting so failures identify their architectural boundary.
4. Re-measure the complete loop after these changes.
5. Establish the first minimal World/Layer extension point without implementing speculative multi-world behavior.
6. Continue the Electrical World using that foundation.

## Safety / scope

- Worlds DEV workflow and Worlds-specific engineering tooling are in scope.
- The Worlds application may be changed when needed to establish stronger architecture/test boundaries.
- Production `scripts/deploy.sh` remains untouched.
- Functional acceptance remains the release gate.
- Do not report an optimization as complete until the relevant workflow has gone through a complete green CI/deployment/acceptance cycle.
- Do not claim a benchmark that has not actually been measured.
