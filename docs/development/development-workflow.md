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
7. Let GitHub Actions build, deploy, and run Worlds browser acceptance on the self-hosted `worlds-dev` runner.
8. Investigate failures using retained Playwright artifacts before making another change.
9. Update canonical documentation when architecture, behavior, workflow, or project state changes.

## Worlds verification rule

For Worlds behavior changes, a successful build is not sufficient. Browser acceptance is the behavioral gate because the product is an interactive visual workspace.

The post-deployment acceptance flow must test the exact deployed revision whenever the deployment workflow provides a commit SHA.

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

Never treat files left on the server as the project source of truth.

## Failure handling

When browser acceptance fails:

1. identify the failing test and exact revision;
2. inspect the Playwright report, screenshot, trace, test result, and acceptance log retained by CI;
3. reproduce locally or on the runner only when the artifacts are insufficient;
4. diagnose the root cause before changing code;
5. update the test if the product contract changed intentionally, otherwise fix the implementation;
6. rerun the relevant acceptance coverage before declaring the change complete.
