# Changelog

All notable changes to MedCred Workforce will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Work in progress toward v0.2. Tracked in GitHub issues under the
`v0.2 — Shift management` milestone.

## [0.1.0] — Applicant onboarding

### Added

- 3-step public application wizard at `/apply` with role branching
  (employee or facility) and credential claim step.
- `POST /api/applications` endpoint with Zod validation and email
  idempotency check.
- Admin applications list at `/applications` with status tabs
  (PENDING / APPROVED / DECLINED) and live counts.
- Admin application review page with Approve / Decline actions, required
  note on decline, and a demo-friendly setup-link flash after approve.
- `PATCH /api/applications/[id]` admin-only endpoint that generates a
  SHA-256-hashed invite token (48-hour TTL) and dispatches the mock
  invite email.
- `/setup-password` token-gated page that validates the invite and
  atomically creates the `User` + `Employee`/`Facility` + PENDING
  `Credential` rows.
- `POST /api/setup-password` endpoint backing the above, returning
  well-defined error codes (`INVALID`, `EXPIRED`, `USED`, `WEAK`).
- Mock email helpers (`src/lib/email.ts`) logging both invite and
  decline messages to the server console for capstone demo purposes.
- Seed update: a pending `Application` (Sarah) so the admin review flow
  has real data out of the gate.

## [0.0.2] — App shell and dashboards

### Added

- Role-aware sidebar with visibility filtered by the current user's role.
- Topbar with user identity, role badge, and sign-out action.
- `(app)` route group layout that enforces authentication and mounts the
  sidebar + topbar shell.
- Landing page at `/` with hero, feature row, and sign-in / apply CTAs.
- Server-side dashboard router at `/dashboard` that dispatches to one of:
  - **Admin dashboard** — pending applications, pending credentials,
    expiring-soon credentials, open shifts, totals, recent applications.
  - **Employee dashboard** — personal credential status, upcoming shifts,
    expiring credentials.
  - **Client (facility) dashboard** — coverage rate, open vs. assigned
    shifts, distinct assigned staff, upcoming shift table.
- Reusable `StatCard` component used across all three dashboards.

## [0.0.1] — Foundation

### Added

- Next.js 16 (App Router, Turbopack) project bootstrapped with
  TypeScript and Tailwind 4.
- Prisma 7 schema with 12 models, 10 enums, native Postgres array fields,
  soft-delete markers on audit-bearing tables, and an immutable
  `credentialCheckSnapshot` on `ShiftAssignment`.
- Neon Postgres development database, migrated with `prisma migrate dev`.
- NextAuth v5 (Auth.js) with the Credentials provider, JWT session
  strategy, role on session via module augmentation, and a split
  edge-safe / Node-only configuration.
- Login page at `/login` with inline error states.
- Middleware-enforced route protection (`src/middleware.ts`) based on
  the `authorized` callback in `auth.config.ts`.
- Seed script that creates an admin, a facility, an approved employee
  (Nora, with two approved credentials), and a pending-review employee
  (Peter, with one pending credential) plus three demo shifts.
