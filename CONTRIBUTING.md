# Contributing & Development Process

This document describes how work is planned, executed, and shipped on
MedCred Workforce. It exists primarily so the capstone reviewer can see
the process that produced the codebase, not only the codebase itself.

The project follows a lightweight **kanban-style agile workflow** modeled
after what a small product engineering team would run day-to-day.
Ceremonies that only make sense at team scale (sprint planning, demo days,
retros) are simulated asynchronously in this single-developer context.

## Tooling

| Purpose | Tool |
|---|---|
| Source of truth | GitHub — issues, pull requests, project board, milestones |
| Progress at a glance | `PROGRESS.md` in the repo root |
| Release history | `CHANGELOG.md` in the repo root |
| Daily work | Branch per feature, small commits, conventional commit messages |

## Workflow

### 1. Work begins as an issue

Every unit of work is captured as a **GitHub Issue**. An issue includes:

- A descriptive title
- A user-story framing ("As an admin, I need to…")
- Explicit acceptance criteria (checkboxes)
- Labels: one `area:*`, optionally one `role:*`, and one `priority:*`
- Assignment to a milestone (e.g. `v0.2 — Shift management`)

Issues live in one of three states tracked on the project board:

- **Backlog** — not yet started
- **In progress** — an open branch exists and work is active
- **Done** — the linked PR is merged and the issue is closed

### 2. Work happens on a branch

Before coding, a feature branch is created:

```
git checkout -b feat/shift-assignment
```

Branch prefix conventions:
- `feat/` — new functionality
- `fix/` — bug fixes
- `refactor/` — internal changes with no behavior change
- `docs/` — documentation-only changes
- `ops/` — infrastructure, CI, deployment

### 3. Commits follow Conventional Commits

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification:

```
feat(shifts): add credential-aware assignment engine
fix(auth): handle expired JWT on server components
docs(readme): document demo account credentials
refactor(prisma): extract eligibility query into lib/shifts.ts
```

Scope is optional but recommended when the change is bounded to a single
area. Commits should be small and focused — a reviewer should be able to
understand what changed from the subject line alone.

### 4. Pull request closes the issue

When the work is complete:

1. Open a pull request from the feature branch to `main`
2. PR description summarizes the change and links the issue(s) with
   `Closes #N` syntax
3. Self-review the diff, run lint and tests locally
4. Merge with a squash commit so `main` stays linear and each feature is
   one commit

On merge, the linked issue closes automatically and the project board
moves the card to **Done**.

### 5. The CHANGELOG records the release

Every version bump (`v0.2`, `v0.3`, etc.) updates `CHANGELOG.md` with a
short summary of what changed under that version, following the
[Keep a Changelog](https://keepachangelog.com/) format.

## Simulation of team ceremonies

Because this is a solo project, team ceremonies are adapted:

| Team ceremony | Solo equivalent |
|---|---|
| Sprint planning | Start of each milestone: triage issues, confirm scope |
| Daily standup | None; written status in weekly log instead |
| Code review | Self-review of the PR diff before merge; conventional commits enforce legibility |
| Sprint retro | End of each milestone: note in `docs/status/` what worked and what didn't |
| Demo day | Capstone defense itself |

## Quality gates

Before merging any PR to `main`:

- [ ] TypeScript compiles with no errors (`pnpm tsc --noEmit`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] Dev server runs without console errors on the affected pages
- [ ] If a migration is added, `prisma db seed` still succeeds
- [ ] If a schema change, `PROGRESS.md` is updated accordingly

## Definition of Done

An issue is only closed when:

1. All acceptance criteria checkboxes are checked
2. The change is merged to `main`
3. Manual test on the affected role(s) confirms end-to-end behavior
4. Documentation (README, CHANGELOG, or inline) is updated if the change
   affects how the system is run or understood

## Out-of-scope work tracking

Ideas that come up but don't make the current milestone are captured as
issues with the label `future` and left in the backlog. They are not
deleted — the backlog is the product memory.
