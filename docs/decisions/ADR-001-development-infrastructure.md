# ADR-001: GitHub-Centric Development Infrastructure

**Status:** Accepted  
**Date:** 2026-09-16

## Context

VilaPro/Lab OS Worlds development requires frequent implementation, deployment, and browser verification. The project already has GitHub Actions and a self-hosted runner for Worlds DEV deployment and acceptance.

Using multiple external coding environments or maintaining a second source tree would increase synchronization and documentation risk.

## Decision

GitHub is the single source of truth for source code, tests, workflows, architecture documentation, decisions, and project state.

The existing self-hosted Worlds runner remains the deterministic build/deployment/browser-verification worker.

Worlds browser acceptance remains a required behavioral gate for deployed Worlds changes.

The repository's canonical documentation hierarchy is preferred over external project documentation systems for engineering truth.

## Consequences

### Positive

- One authoritative source for code and documentation.
- Exact revisions can be built and verified.
- Browser failures can retain CI evidence.
- Future AI engineering sessions can start from repository documentation rather than uploaded copies.
- Architecture and acceptance contracts can evolve alongside implementation.

### Negative / trade-offs

- The self-hosted runner must be maintained.
- Documentation requires deliberate updates when architecture or workflow changes.
- CI failures can consume server resources and therefore require runner hygiene.

## Alternatives rejected

### External AI coding platform as a second environment

Rejected because it would create another source tree and increase synchronization overhead without solving the project's primary bottleneck.

### External documentation platform as engineering source of truth

Rejected because code, tests, workflows, and architectural documentation are tightly coupled and should evolve in the same repository.

### Immediate Docker migration

Deferred. Containerization may be introduced later if the existing runner demonstrates an actual isolation or environment-drift problem.
