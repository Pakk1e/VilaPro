# Worlds CI Runner

## Purpose

The self-hosted runner provides a deterministic machine for Worlds build, deployment, and browser verification. It is a worker only; GitHub remains the source of truth.

## Runner contract

The Worlds workflows target the `self-hosted` and `worlds-dev` labels. The runner must be able to:

- check out repository revisions;
- run Node/npm project commands;
- build the Worlds frontend;
- run Playwright smoke and acceptance tests;
- retain enough local state for the configured Playwright browser installation/cache;
- access the deployed DEV application and any required local services.

The current acceptance workflows use Node 22 and Playwright 1.63.0. The persistent Playwright package is stored under `$HOME/.cache/vilapro-playwright/1.63.0`; the workflow links that installation into the checked-out frontend rather than reinstalling it into every workspace.

## Performance model

The runner is an 8-thread, 8 GB-class host, so concurrency must be measured rather than maximized blindly. Worlds full acceptance defaults to four Playwright workers, with `WORLDS_E2E_WORKERS` available for controlled benchmarking. The smoke suite deliberately uses two workers because it is small and should return predictable fast feedback.

GitHub Actions `setup-node` uses npm caching for dependency download reuse. The Playwright package is persistent on the runner. Browser installation is currently still verified with `npx playwright install chromium`; this can be changed to a cheap executable/cache check only after runner provisioning has been shown reliable across repeated jobs.

## Safety boundaries

The runner server may host other Lab OS services. Acceptance tests must be treated as isolated project workloads.

Do not:

- edit the repository manually on the server as the normal development method;
- use server-local uncommitted files as a source of truth;
- let acceptance tests modify production data or production services;
- introduce persistent application state solely to make a test pass;
- delete unrelated services, PM2 processes, databases, or configuration while troubleshooting the runner.

When server maintenance is required, inspect the active services and runner configuration before changing anything.

## Workspace hygiene

Runner workspaces, caches, Playwright artifacts, and temporary build output should be cleaned according to the workflow's actual behavior. Persistent Playwright cache is intentional; repository source state remains disposable and is checked out from GitHub for each acceptance job.

## Troubleshooting order

1. Check the GitHub Actions run and exact revision.
2. Check runner availability and labels.
3. Check the job log for the failing step.
4. Check smoke diagnostics first when smoke failed before full acceptance.
5. Check Playwright artifacts for browser failures.
6. Check local application/service logs.
7. Check memory, disk, and process state if the failure suggests resource pressure.
8. Only then modify runner configuration.

## Disable/unregister

If the runner must be removed from service, stop or disable it using the runner installation's documented service mechanism and confirm that GitHub no longer schedules Worlds jobs to it. Do not remove the repository checkout or other server services merely because the runner is being disabled.

## Infrastructure policy

Docker is not required for the current CI design. Introduce containerization only if the repository demonstrates a real environment-drift or isolation problem that the existing runner model cannot reasonably solve.
