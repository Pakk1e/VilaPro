# Development Workflow

## Source of truth

GitHub is the source of truth for VilaPro/Lab OS. Code, tests, workflow definitions, architecture decisions, and canonical project documentation belong in the repository.

The server used by CI is a worker. It must not become a second source tree or an alternate place where project code is edited.

## Normal change flow

1. Start from `v0.4/dev-deploy` for active Worlds development unless the task explicitly targets another branch.
2. Read `docs/START_HERE.md` and the canonical documents relevant to the change.
3. Inspect the existing implementation and acceptance coverage before changing behavior.
4. Implement the smallest coherent change.
5. Add or update automated tests for changed behavior.
6. Commit and push to GitHub.
7. Let GitHub Actions run only the relevant CI workflows, deploy Worlds when deployable paths changed, run the fast smoke gate, and then run full Worlds browser acceptance on the self-hosted `worlds-dev` runner.
8. Investigate failures using retained Playwright artifacts before making another change.
9. Update canonical documentation when architecture, behavior, workflow, or project state changes.

## Worlds verification rule

For Worlds behavior changes, a successful build is not sufficient. Browser acceptance is the behavioral gate because the product is an interactive visual workspace.

The post-deployment acceptance flow must test the exact deployed revision whenever the deployment workflow provides a commit SHA. The smoke suite is an early failure gate; the full acceptance suite remains the comprehensive behavioral gate.

## CI performance model

The Worlds pipeline has four distinct costs:

1. **Deployment:** source synchronization, `npm ci`, Vite build, service restart, and health checks.
2. **Acceptance setup:** checkout, Node setup, frontend dependency installation, and Playwright/Chromium preparation.
3. **Smoke acceptance:** a small deterministic set of critical deployment-path checks.
4. **Full browser acceptance:** the comprehensive Playwright suite plus diagnostic artifact collection on failure.

The 2026-09-16 audit of run `35117459060` showed that acceptance setup was already relatively small: frontend dependency installation took about 5.8 seconds, Playwright runner reuse about 10 ms, and Chromium verification about 0.8 seconds. The dominant cost was the browser suite and, after failure, uploading overlapping artifacts. The failed suite ran 27 tests with 3 workers and took about 3.6 minutes; 25 tests failed, mostly after 30-second interaction timeouts. Artifact collection then added roughly 2.5 minutes because the report and screenshots were uploaded separately and then uploaded again inside the failure bundle.

### Current optimization rules

- Use `setup-node` npm caching for acceptance dependencies.
- Keep the persistent Playwright installation on the self-hosted runner.
- Default full Worlds acceptance to 4 workers on the 8-thread runner; allow `WORLDS_E2E_WORKERS` to override this when benchmarking or diagnosing contention.
- Run a two-test smoke suite before full acceptance so fundamental deployment/UI failures stop before the expensive suite starts.
- Upload one combined failure-diagnostics artifact only when acceptance fails. Do not upload the same report/screenshots again as separate always-on artifacts.
- Use artifact compression level `0` for the failure bundle because Playwright videos/traces/screenshots are already poor compression targets and upload speed is more valuable than archive size during debugging.
- Separate frontend and Worlds backend CI so unrelated source changes do not consume both test jobs.
- Path-filter Worlds deployment so documentation-only changes do not restart the DEV services.
- Keep exact-revision acceptance after deployment so speed improvements do not weaken deployment-to-test correctness.

### Further optimization targets

The next performance work should be evidence-driven:

1. Fix the current acceptance interaction regressions first; repeated 30-second timeouts dominate failed-run latency.
2. Benchmark 2, 3, 4, and 5 full-suite workers after the suite is healthy and select the fastest stable setting.
3. Replace repeated `npx playwright install chromium` with a cheap browser availability check after persistent runner provisioning has been verified across repeated jobs.
4. Evaluate whether the deployment build can safely consume a CI-produced frontend artifact; only do this if it preserves exact-revision deployment correctness.
5. If the suite grows materially, shard Playwright across additional runners rather than overloading the single 8-thread host.
6. Keep visual evidence focused on dedicated visual/release checks rather than generating large screenshot collections from every functional acceptance test.

Do not optimize by weakening assertions, removing behavioral coverage, or hiding failures.

## Documentation update rule

Update documentation in the same development cycle when a change affects:

- architecture or state boundaries
- user interaction conventions
- acceptance criteria
- development/deployment workflow
- runner requirements
- important project state or known limitations
- an architectural decision

Do not duplicate the same fact across many documents. Put each fact in its canonical location and link to it from navigation documents.

## Temporary vs canonical documentation

`docs/superpowers/` contains temporary design/specification/planning material used during implementation.

Canonical project documentation lives elsewhere under `docs/` and is what future development sessions should trust for the current system.

## Branch and deployment model

The active development branch is `v0.4/dev-deploy`. The deployment workflow checks out the requested revision on the self-hosted Worlds runner and the acceptance workflow verifies the deployed application.

The deployment workflow delegates source synchronization to `scripts/deploy-worlds-dev.sh` so the same Git synchronization is not performed twice.

Never treat files left on the server as the project source of truth.

## Failure handling

When browser acceptance fails:

1. identify the failing test and exact revision;
2. inspect the single Playwright failure-diagnostics artifact retained by CI;
3. reproduce locally or on the runner only when the artifact is insufficient;
4. diagnose the root cause before changing code;
5. update the test if the product contract changed intentionally, otherwise fix the implementation;
6. rerun the relevant acceptance coverage before declaring the change complete.
