# Workflow Optimization

This document defines the workflow-speed work for the Worlds development loop. The goal is to reduce feedback time without weakening the acceptance gate or making the self-hosted runner less deterministic.

The optimization work is intentionally separated from Worlds application behavior. It may change GitHub Actions workflows, deployment scripts used only by Worlds DEV, and runner/tooling configuration. The production `deploy.sh` remains untouched.

## Current problem

The Worlds DEV loop currently performs overlapping validation and browser-tool installation across deployment and acceptance:

```text
push
  -> CI validation
  -> Worlds DEV deployment
       - backend tests
       - npm ci
       - frontend lint
       - frontend tests
       - frontend build
       - service restart / health checks
       - Playwright runner install
       - Chromium install
       - browser smoke
  -> Worlds acceptance
       - npm ci
       - Playwright runner install
       - Chromium install/check
       - full acceptance suite
```

This creates unnecessary wall-clock time, especially on the persistent `worlds-dev` self-hosted runner. A failed acceptance test can also stop the suite early, which means another complete deployment/test cycle is needed to discover later failures.

## Optimization principles

1. **Measure before optimizing.** Record step-level durations and runner resource usage instead of guessing which operation is slow.
2. **Do not weaken validation.** The final acceptance gate must still run the complete suite and require every test to pass.
3. **Remove duplicated work first.** Deployment and acceptance should each do only the work needed for their role.
4. **Keep deployment deterministic.** Persistent caches/tooling must not allow stale dependencies or browsers to silently change the tested revision.
5. **Serialize deployment and acceptance.** Acceptance must validate the revision that was actually deployed and only start after a successful deployment/health check.
6. **Use parallelism only when measured runner capacity supports it.** More Playwright workers are not automatically faster on a constrained self-hosted runner.
7. **Keep production deployment untouched.** `deploy.sh` is outside this optimization scope.

## Phased plan

### W1 — Baseline measurement

Instrument the Worlds DEV deployment and acceptance workflows so every expensive step reports a duration. Measure:

- git update/checkout
- backend test suite
- frontend dependency installation
- frontend lint
- frontend tests
- frontend build
- service restart
- health checks
- Playwright runner installation
- Chromium installation/check
- browser smoke
- full browser acceptance

Where practical, also capture runner CPU, RAM, disk and network characteristics during the expensive steps.

**Exit condition:** one complete deployment + acceptance cycle has a timing baseline that identifies the dominant costs.

### W2 — Remove duplicated validation from deployment

The Worlds DEV deployment script should be responsible for deploying a known revision, starting/restarting the Worlds services, and performing health checks. CI remains responsible for source validation.

Evaluate moving frontend build output into CI artifacts only if that produces a measured improvement without making deployment less reliable. Do not introduce this complexity merely for theoretical speed.

**Exit condition:** deployment no longer repeats CI-only validation unless a specific deployment requirement justifies it.

### W3 — Persistent browser tooling and dependency cache

- Keep npm download caching enabled through `setup-node`.
- Keep Playwright Chromium installed on the persistent `worlds-dev` runner.
- Avoid downloading/installing the same browser on every run when the required browser revision is already present.
- Keep `npm ci` deterministic; do not replace it with an uncontrolled `npm install` just to save time.

**Exit condition:** repeated runs reuse safe cached resources and show a measurable reduction in setup time.

### W4 — Acceptance execution

The acceptance workflow remains the authoritative browser gate.

- Run the **entire acceptance suite** in every acceptance run.
- Do not use `--max-failures=1` for the final acceptance gate.
- Keep retries at zero unless a specific flaky-test investigation proves retries are required.
- Tune Playwright workers only after W1 resource measurements.
- Preserve screenshots, reports and failure artifacts.

This is important: a failed test must not cause the run to stop before the other independent tests have reported. We want one run to tell us the complete state of the release candidate.

**Exit condition:** one acceptance run reports all tests, with no early termination, and remains green when the code is correct.

### W5 — Deployment → acceptance contract

Make the relationship explicit:

```text
CI green
   ↓
Deploy exact commit
   ↓
Health checks green
   ↓
Acceptance exact deployed commit
```

Acceptance must not accidentally test an older/newer checkout because another push arrived while the runner was busy. Concurrency/cancellation behavior must be reviewed as part of this phase.

**Exit condition:** acceptance logs clearly identify the deployed commit under test.

### W6 — Resource-aware parallelism

After W1 data is available, test controlled Playwright parallelism. Start conservatively and compare wall-clock time, CPU saturation, memory pressure and test stability.

Do not increase workers if it makes the runner slower or less reliable.

**Exit condition:** worker count is evidence-based and improves total feedback time without increasing functional failures.

### W7 — Re-measure and document

Run several representative Worlds changes through the optimized workflow and compare them with the W1 baseline.

Record:

- median deployment duration
- median acceptance duration
- total push-to-green time
- cache/setup time
- browser execution time
- failure diagnosis time

**Exit condition:** the optimization has a measured benefit and the final workflow remains deterministic.

## Target workflow

```text
                         PUSH
                           │
                           ▼
                  ┌─────────────────┐
                  │   Worlds CI     │
                  │                 │
                  │ backend tests   │
                  │ frontend tests  │
                  │ lint + build    │
                  └────────┬────────┘
                           │
                         GREEN
                           │
                           ▼
                  ┌─────────────────┐
                  │ Worlds DEV      │
                  │ deployment      │
                  │                 │
                  │ deploy revision │
                  │ restart         │
                  │ health check    │
                  └────────┬────────┘
                           │
                         HEALTHY
                           │
                           ▼
                  ┌─────────────────┐
                  │ Browser         │
                  │ Acceptance     │
                  │                 │
                  │ ALL tests run  │
                  │ no early stop  │
                  └────────┬────────┘
                           │
                     ALL GREEN
                           │
                           ▼
                         DONE
```

## Priority

1. W1 — baseline measurement
2. W2 — remove duplicated validation
3. W3 — persistent npm/Playwright tooling
4. W4 — complete acceptance execution without early termination
5. W5 — exact deployment/acceptance revision contract
6. W6 — measured worker parallelism
7. W7 — final measurement and documentation

## Safety / scope

- Worlds DEV workflow and Worlds-specific deployment tooling are in scope.
- The Worlds application itself should not be changed merely to optimize CI.
- Production `scripts/deploy.sh` must remain untouched.
- Functional acceptance remains the release gate.
- Do not report the optimization as complete until the relevant workflow changes have gone through a complete green CI/deployment/acceptance cycle.
