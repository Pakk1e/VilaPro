# Workflow Optimization

This document records CI/runner speed improvements to implement after the current Worlds acceptance baseline is stable.

## Self-hosted runner optimization backlog

- Cache npm downloads between GitHub Actions runs so dependency installation can reuse the runner's local npm cache.
- Keep Playwright Chromium installed on the persistent `worlds-dev` runner instead of reinstalling the browser on every acceptance run.
- Avoid repeating expensive build steps in workflows that only need to exercise the already deployed Worlds application.
- Make the acceptance flow depend on successful Worlds DEV deployment/health checks, rather than allowing acceptance tests to race the deployment workflow.
- Reuse persistent runner state where safe, while keeping dependency installation deterministic enough to avoid stale-package failures.
- Measure CPU, RAM, disk and network usage during `npm ci`, frontend builds and Playwright runs before making larger runner changes.
- Consider splitting independent CI work into parallel jobs where the extra runner capacity provides a real wall-clock benefit.
- Keep the existing production `deploy.sh` untouched.

## Priority

1. npm cache
2. persistent Playwright browser installation
3. remove redundant work from acceptance tests
4. serialize deployment -> acceptance
5. measure runner resource bottlenecks and parallelize where useful

The optimization work should be done after the acceptance suite is green so performance changes do not get mixed with functional test debugging.
