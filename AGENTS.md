# VilaPro / Lab OS — Engineering Guide

This repository is being developed as VilaPro / Vadovsky Tech — Lab OS. The long-term direction is a visual system-modeling workspace in which users can build, inspect, simulate, and progressively explore systems at different abstraction layers.

## 1. Work from the actual repository state

- Inspect the current code, tests, git history, and relevant documentation before changing anything.
- Do not assume that a previous implementation, commit, test count, or deployment state is still correct; verify it.
- Prefer small, focused changes over broad rewrites.
- Preserve working behavior unless the task explicitly changes the contract.
- If an assumption cannot be verified, say so rather than presenting it as fact.

## 2. Architecture principles

- Keep the frontend visual/canvas model separate from the backend simulation/VDL representation.
- Treat the circuit/world model as a domain model, not as a UI implementation detail.
- Keep simulation logic out of API handlers and UI components.
- Prefer shared domain/application abstractions over duplicated implementations.
- Maintain a clear separation between configuration, execution, state, and results.
- Analysis type and execution mode are independent concepts. Analysis may be DC, transient, AC, etc.; execution mode may be Static or Live.
- Static simulation is request → execution → complete result.
- Live simulation is a session/runtime with evolving state and sampled updates; do not model it merely as a large static result.
- Live runtime abstractions should remain layer-independent so future electrical, thermal, mechanical, control, fluid, and multiphysics simulations can share the architecture.
- Do not introduce WebSocket/SSE complexity merely for appearance. Establish the runtime/session contract first, then add transport when required.
- Do not stream every solver timestep directly to the UI; use sampling/aggregation appropriate for presentation.

## 3. Hierarchical Worlds direction

A World is both a thing and a composition of other things. Preserve the ability to represent higher-level entities using lower-level internal worlds/representations.

Features should preferably do at least one of the following:

1. Improve the current abstraction.
2. Enable moving downward into a more detailed physical/model layer.
3. Enable moving upward into a more complex composed system.
4. Improve infrastructure required for hierarchical Worlds.

Avoid premature implementation of much lower-fidelity layers when the current abstraction is not structurally sound.

## 4. Simulation rules

- Preserve physical meaning and numerical data. Do not hide numerical problems with arbitrary clamping or tolerances unless that is explicitly part of the numerical method.
- Keep numerical simulation values separate from presentation/formatting logic.
- Use semantic units and dimensions; do not add an SI base dimension just to make a derived-unit error disappear.
- Henry (H) is a derived SI unit and must remain represented consistently as such.
- Do not reintroduce `initial_voltage` as a capacitor or inductor component parameter unless there is a deliberate architectural decision to change that model.
- Prefer generic result/dataset/series infrastructure that can be reused by DC, transient, AC, and future analyses.
- Preserve component identity through serialization and results so simulation data can map back to visual components.
- A circuit should remain independently representable from a particular simulation run; multiple configurations/runs should be possible without mutating the circuit model.

## 5. Frontend rules

- Keep canvas interaction, visual state, and presentation concerns separate from simulation/domain concerns.
- Prefer reusable visualization primitives (Dataset → Series → Plot) instead of analysis-specific plotting implementations.
- Use a single source of truth for engineering-value/result formatting.
- Formatting must not change raw simulation values.
- Avoid duplicating component-to-backend mappings in multiple UI components.
- Do not modify the live production frontend merely to test `frontend-dev` Worlds work.

## 6. Backend and deployment rules

- Worlds is the Python simulation/backend layer.
- The Worlds API is separate from the simulation engine and should remain a thin application/transport boundary.
- The deployed Worlds API is managed by `worlds-api.service` under systemd; do not switch it to PM2 unless there is a specific architectural reason.
- Never restart production services as part of an ordinary code investigation unless the task explicitly requires deployment.
- Deployment changes and source-code changes should be treated as separate concerns.

## 7. Testing requirements

- Every new behavior should have a relevant regression or unit/integration test where practical.
- Run the smallest relevant tests during development, then run the complete applicable suite before declaring work complete.
- For backend changes, use the repository's Worlds test suite rather than relying only on manual API checks.
- For frontend changes, run the relevant test suite and production build when applicable.
- CI is the clean-environment source of truth for whether the committed repository passes its configured checks.
- Never claim tests/builds passed unless they were actually run and the result is known.
- When CI fails, inspect the actual failure/log output and fix the underlying issue rather than weakening or bypassing the check.
- Do not remove or loosen a regression test simply because an implementation fails it.

## 8. Git and change management

- Keep commits focused and explain what changed.
- Avoid mixing unrelated refactors with feature work.
- Do not rewrite large files or architectural boundaries when a smaller change is sufficient.
- Before modifying an existing file, inspect its current version and relevant callers/tests.
- When changing a public/internal contract, search for callers and tests that depend on the old contract.
- After implementation, review the diff for accidental changes.

## 9. Debugging discipline

For bugs, prefer this sequence:

1. Reproduce or inspect the actual failing behavior.
2. Trace the data/control flow to the responsible layer.
3. Identify the smallest correct fix.
4. Add a regression test that would have caught the bug.
5. Implement the fix.
6. Run relevant tests/builds.
7. Review the final diff and CI result.

Do not fix symptoms in a presentation layer when the underlying domain behavior is wrong, and do not alter domain behavior to solve a presentation-only problem.

## 10. Autonomous implementation loop

When a task is sufficiently specified, work through as much of this loop as possible without unnecessary pauses:

`inspect → plan → implement → test → inspect failures → fix → test again → review → commit`

If a failure is caused by the current implementation and the intended behavior is clear, fix it rather than stopping after reporting the failure.

Stop and ask for clarification when the requested behavior is genuinely ambiguous, requires a product decision, would break an established architectural contract, or could affect production in a risky way.

## 11. Definition of done

A change is not complete merely because the code was edited. Prefer to finish with:

- implementation complete;
- relevant tests added/updated;
- relevant local checks run when available;
- clean diff reviewed;
- CI result checked when available;
- architectural/documentation impact considered;
- deployment explicitly separated from development unless deployment was requested.
