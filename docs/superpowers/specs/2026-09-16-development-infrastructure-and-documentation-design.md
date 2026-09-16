# Development Infrastructure & Workflow Design

**Date:** 2026-09-16  
**Branch:** `v0.4/dev-deploy`  
**Status:** Proposed design

## Goal

Make Worlds development faster and safer by treating GitHub as the source of truth, using the existing self-hosted server runner for deterministic build/browser verification, and documenting the real development, deployment, and acceptance workflow in the repository.

## Current State

The repository already has a Worlds DEV deployment workflow and a reusable Worlds browser-acceptance workflow. Both target the self-hosted `worlds-dev` runner. The DEV deployment checks out the requested branch, runs `scripts/deploy-worlds-dev.sh`, then invokes the acceptance workflow against the exact deployed commit.

The acceptance workflow already records runner baseline information, installs frontend dependencies, reuses a persistent Playwright installation, ensures Chromium, runs the complete acceptance suite with retained traces on failure, and uploads reports/screenshots/failure artifacts.

The remaining problem is not the absence of infrastructure; it is that the workflow and project conventions are not documented as a single development system, and the CI path can be made more explicit and regression-resistant.

## Design Principles

1. **GitHub is the source of truth.** Development work, commits, branches, workflow definitions, tests, and documentation live in the repository.
2. **The server is a build/test worker, not a second source tree.** The runner executes checked-out revisions; it does not become the canonical place where code is edited.
3. **Browser behavior is a release gate for Worlds.** A successful build is insufficient; the acceptance suite must exercise the actual deployed UI.
4. **Exact revisions are tested.** Post-deployment acceptance receives the deployed commit SHA so the code being tested is the code that was deployed.
5. **Failures must be diagnosable.** Playwright reports, traces, screenshots, test results, and the raw acceptance log are retained as CI artifacts.
6. **Contextual Worlds UX remains intentional.** Library/tools/inspector/instruments are contextual surfaces around the schematic canvas, not permanent dashboard regions.
7. **One graph model remains authoritative.** UI interactions update the canonical Worlds graph through the established boundaries; local inspector state must not become a competing graph source.

## Proposed Repository Documentation

Add a compact documentation hierarchy:

```text
docs/
├── development/
│   ├── development-workflow.md
│   ├── server-runner.md
│   └── testing.md
├── worlds/
│   ├── architecture.md
│   ├── interaction-model.md
│   └── acceptance-matrix.md
├── decisions/
│   └── ADR-001-development-infrastructure.md
└── superpowers/
    ├── specs/
    │   └── 2026-09-16-development-infrastructure-and-documentation-design.md
    └── plans/
```

The README should become the entry point: explain what VilaPro is today, identify Worlds as an active subsystem, link to the development workflow, and point contributors to the Worlds architecture and testing documents.

## Development Workflow

The documented workflow will be:

```text
Local development
      ↓
Commit / push to GitHub
      ↓
GitHub Actions on self-hosted Worlds runner
      ├── checkout exact revision
      ├── install/build/test
      ├── Worlds smoke/acceptance verification
      └── retain evidence on failure
      ↓
Worlds DEV deployment
      ↓
Post-deploy acceptance against deployed SHA
      ↓
DEV considered verified
```

Where a change affects only documentation or non-Worlds code, the workflow may remain lighter. Worlds behavior changes must retain browser acceptance coverage.

## CI Improvements

The implementation should preserve the working deployment path while making the following improvements:

- Keep the existing `self-hosted` + `worlds-dev` runner labels.
- Add a clearly named fast Worlds smoke gate before the complete suite where practical, without duplicating assertions unnecessarily.
- Keep the full suite as the authoritative browser regression gate.
- Ensure failure artifacts have predictable names and locations.
- Keep exact deployed-SHA propagation from deployment into acceptance.
- Document required runner labels, paths, environment variables/secrets, Node/Playwright versions, and operational assumptions.
- Avoid installing unnecessary SaaS/AI development platforms or introducing a second source-of-truth environment.

## Server Runner Safety

The existing server is also used for other Lab OS/project services, so the runner must be treated as a controlled workload. Documentation will specify:

- runner working directory and repository ownership
- expected labels
- Node/npm/Playwright prerequisites
- persistent Playwright cache behavior
- disk and memory expectations
- cleanup expectations for workspaces and artifacts
- rule that production services must not be modified by acceptance tests
- how to disable/unregister the runner safely

No Docker migration is required as part of this change. Containerization remains an optional future hardening step if environment drift becomes a real problem.

## Worlds Architecture Documentation

The Worlds architecture document will capture the current intended separation:

```text
Worlds UI
  ├── schematic canvas
  ├── contextual component Library
  ├── contextual object-local Inspector
  └── contextual Instruments / simulation controls
          ↓
Worlds interaction/state boundary
          ↓
Canonical graph model
          ↓
Simulation / VDL representation
```

The visual graph and simulation/VDL representation remain separate concerns, connected through explicit translation/state boundaries rather than sharing arbitrary UI state.

## Acceptance Matrix

Document the critical behaviors currently protected by acceptance tests, including:

- opening and closing the contextual Library
- placing components on the schematic canvas
- keeping placed components outside the contextual Library overlay
- selecting components and opening object-local inspection
- editing component properties through the graph update boundary
- verifying edited properties reach the canonical debug graph
- connecting component ports
- contextual instrument access
- simulation setup visibility and controls
- electrical example circuits
- expected regression evidence/artifacts

The matrix will map each behavior to its Playwright test file and the primary UI contract (`data-testid`, role/name, or graph-state assertion) used to verify it.

## Non-Goals

- Replacing GitHub with another code-hosting platform.
- Introducing a general-purpose AI coding platform as another development environment.
- Rebuilding the Worlds UI as part of this infrastructure/documentation change.
- Migrating the server to Docker solely for CI.
- Adding analytics/telemetry platforms before there is a demonstrated need.
- Making the contextual Worlds UI into a permanent multi-panel dashboard.

## Acceptance Criteria

The design is considered implemented when:

1. A new contributor can understand how to develop, deploy, and verify Worlds from repository documentation alone.
2. The self-hosted runner requirements and safety boundaries are documented.
3. The deployment workflow and acceptance workflow are documented against their actual repository behavior.
4. Worlds architecture and interaction conventions are documented so future UI changes do not accidentally revert to the old dashboard model.
5. Acceptance coverage is mapped to explicit behaviors and contracts.
6. CI retains enough evidence to diagnose browser failures without reproducing the failure manually first.
7. README links the relevant documentation instead of remaining a generic project description.
