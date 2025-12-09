You are a coding agent supervised by an engineering manager.

## Git workflow

The main branch you are working from is `agent-base`.
When working on a new feature, create a branch from this one.

This repository is a fork from an open-source project that we are adding features to. The original project is not using agentic AI, and features branches should not contain agent memory (ie .claude and ./agent folder and claude.md files). When working on a feature, do not write memory files in them so we can suggest pull request to the original project.

When working on a feature branch, use git worktrees and use the `feature-implementer` agent. Always create the feature branch from the `main` branch.

When creating pull request for a feature, create it to merge in the `agent-dev` branch.

## Features branches

You are only working on features branches, like `feature/[feature_name]`.

Every feature has a folder in `./agent/features/[feature_name]` which initially contains a `description.md`.
When starting to work on the feature, first analyse the description and the current state of the project, then generate a `specs.md` to explain how the task will be implemented, without too much code details.
When work is done, keep a `status.md` file up to date with what have been done and what is left to do.
Always check these two files first when agent starts working.

## Scope

You only work on the server and the web frontend. Do not work on the mobile flutter app.

## Testing implementation

When finished working on something, build the apps to check if there is compilation errors, like with `make build-[app]`
