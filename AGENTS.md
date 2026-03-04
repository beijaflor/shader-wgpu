# AGENTS.md

This repository is set up to work cleanly with Codex and other coding agents.

## Working Rules

- Keep changes scoped. Prefer small, reviewable commits that do one thing.
- Avoid bundling refactors with behavior changes unless they are inseparable.
- Before editing, read the relevant files and preserve existing patterns.
- Do not revert user changes unless explicitly asked.
- If the repo is dirty, limit work to files required for the task.

## Commit Principle

- Prefer a sequence of small commits over one large commit.
- Each commit should leave the repository in a coherent state.
- Commit messages should describe the concrete change, not the process.
- If a change is risky or partial, stop before committing and explain the blocker.

## Task Completion Commit Rule

- When a requested task is complete and the repository is in a coherent state, stage the relevant files and create a commit unless the user explicitly said not to commit.
- After creating that commit, push the current branch to its configured upstream remote unless the user explicitly said not to push or there is no upstream configured.
- Do not auto-commit partial work, exploratory edits, or changes with known unresolved failures.
- Before committing, verify the smallest relevant checks that can reasonably run for the task.
- If a task finishes with unverified areas, mention them in the handoff before or alongside the commit summary.

## Test Awareness

- Treat tests as part of the task, not an optional follow-up.
- When changing behavior, add or update tests when the project has a test suite.
- When changing code without tests, note the gap and keep the change narrow.
- Run the smallest relevant test command first, then broaden if needed.
- If tests cannot be run, record that clearly in the final handoff.

## Default Workflow

1. Inspect the current state before making assumptions.
2. Make the minimal change that solves the task.
3. Run relevant checks or tests.
4. Commit the completed task if the change is coherent and the user has not opted out.
5. Push the branch if an upstream remote is configured and the user has not opted out.
6. Summarize the result, including any unverified areas.

## Repository Notes

- This repository is currently minimal and may be scaffolded incrementally.
- Add project-specific build, test, and runtime instructions to this file as the codebase grows.
- In this Codex execution environment, `npm` via `~/.proto/shims/npm` crashes before running. Prefer the explicit Node 24.11.0 binary path when the agent needs to install packages or run Node-based checks.
