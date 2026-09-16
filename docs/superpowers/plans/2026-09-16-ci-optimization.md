# Worlds CI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Worlds development feedback time without weakening behavioral verification or creating a second source of truth.

**Architecture:** Keep GitHub as the source of truth and the existing self-hosted `worlds-dev` runner as the worker. Optimize by filtering irrelevant workflow executions, separating fast feedback from full acceptance, reusing runner/browser caches, and measuring actual wall-clock/resource cost before changing concurrency.

**Tech Stack:** GitHub Actions, self-hosted Ubuntu runner, Node 22/npm, Playwright 1.63.0, Python 3.11, React/Vite.

**Spec:** `docs/development/development-workflow.md`, `docs/development/testing.md`, `docs/development/server-runner.md`

## Global Constraints

- GitHub remains the single source of truth.
- Browser acceptance remains the behavioral gate for Worlds UI changes.
- Do not weaken tests or hide product regressions to improve CI time.
- Test the exact deployed revision after deployment.
- Do not introduce Docker unless a measured isolation/environment-drift problem requires it.
- Preserve the existing `worlds-dev` runner safety boundaries.

---

### Task 1: Correct workflow triggering boundaries

**Files:**
- Modify: `.github/workflows/deploy-worlds-dev.yml`
- Modify: `scripts/deploy-worlds-dev.sh`

**Interfaces:** Deployment remains branch/ref based and continues to expose the exact deployed SHA to the reusable acceptance workflow.

- [ ] Add path filters so documentation-only changes do not deploy Worlds.
- [ ] Keep workflow files and deployment script in the trigger paths because changes to them can affect deployment behavior.
- [ ] Change the deployment script fallback branch to the active `v0.4/dev-deploy` branch.
- [ ] Verify the workflow YAML and script remain valid.

### Task 2: Separate fast smoke feedback from full acceptance

**Files:**
- Create: `.github/workflows/worlds-smoke.yml`
- Create: `frontend-dev/tests/e2e/smoke-acceptance.spec.js`
- Modify: `.github/workflows/deploy-worlds-dev.yml`

**Interfaces:** Smoke workflow tests the exact deployed SHA and uses the same `BASE_URL` and credentials as full acceptance.

- [ ] Add a small deterministic smoke suite covering page load, Worlds identity, Library open, component placement, selection, and object-local inspection.
- [ ] Make smoke run after deployment and before the full acceptance job.
- [ ] Keep full acceptance as the comprehensive behavioral gate rather than replacing it.
- [ ] Configure smoke with a short timeout and no retries so obvious failures return quickly.

### Task 3: Optimize frontend/backend CI execution

**Files:**
- Modify: `.github/workflows/worlds-tests.yml` or split into focused workflow files if needed.

- [ ] Prevent backend-only work from requiring frontend-specific checks and vice versa.
- [ ] Keep independent backend/frontend checks parallel.
- [ ] Avoid duplicate build work where an artifact can safely be reused without changing deployment correctness.

### Task 4: Optimize persistent Playwright infrastructure

**Files:**
- Modify: `.github/workflows/worlds-acceptance.yml`
- Modify: `docs/development/server-runner.md`

- [ ] Keep Playwright package installation persistent on the runner.
- [ ] Replace repeated browser installation with a cheap browser-availability check once the runner cache is confirmed reliable.
- [ ] Record actual runner versions only after observing them from CI.

### Task 5: Benchmark worker count

**Files:**
- Modify: `docs/development/testing.md`

- [ ] Run healthy acceptance with 2, 3, 4, and 5 workers.
- [ ] Record wall time, failures, and runner CPU/memory observations.
- [ ] Select the fastest stable worker count rather than assuming maximum parallelism is fastest.

### Task 6: Update canonical status documentation

**Files:**
- Modify: `docs/development/development-workflow.md`
- Modify: `docs/development/testing.md`
- Modify: `docs/development/server-runner.md`
- Modify: `docs/CURRENT_STATUS.md`

- [ ] Document the actual optimized workflow after CI verification.
- [ ] Record measured timings and known remaining bottlenecks.
- [ ] Remove obsolete workflow statements rather than duplicating optimization facts across documents.
