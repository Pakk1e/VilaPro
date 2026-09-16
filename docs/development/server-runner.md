# Worlds CI Runner

## Purpose

The self-hosted runner provides a deterministic machine for Worlds build, deployment, and browser verification. It is a worker only; GitHub remains the source of truth.

## Runner contract

The Worlds workflows target the `self-hosted` and `worlds-dev` labels. The runner must be able to:

- check out repository revisions;
- run Node/npm project commands;
- build the Worlds frontend;
- run Playwright acceptance tests;
- retain enough local state for the configured Playwright browser installation/cache;
- access the deployed DEV application and any required local services.

The exact versions and paths should be recorded here when they are intentionally pinned by the repository/workflow. Do not document guessed versions.

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

Runner workspaces, caches, Playwright artifacts, and temporary build output should be cleaned according to the workflow's actual behavior. If disk or memory pressure appears, diagnose the runner workload before increasing resources or adding infrastructure.

## Troubleshooting order

1. Check the GitHub Actions run and exact revision.
2. Check runner availability and labels.
3. Check the job log for the failing step.
4. Check Playwright artifacts for browser failures.
5. Check local application/service logs.
6. Check memory, disk, and process state if the failure suggests resource pressure.
7. Only then modify runner configuration.

## Disable/unregister

If the runner must be removed from service, stop or disable it using the runner installation's documented service mechanism and confirm that GitHub no longer schedules Worlds jobs to it. Do not remove the repository checkout or other server services merely because the runner is being disabled.

## Infrastructure policy

Docker is not required for the current CI design. Introduce containerization only if the repository demonstrates a real environment-drift or isolation problem that the existing runner model cannot reasonably solve.
