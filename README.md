# MedCred Workforce

> Healthcare staffing built around credentials, not calendars.

A full-stack web application that matches credentialed healthcare workers
to hospital shifts, with credential-aware compliance enforced in code.

This is a capstone project built to demonstrate end-to-end full-stack
engineering: schema design, authentication, role-aware access control,
domain modeling, and a marquee feature — an immutable compliance
snapshot that records exactly what the system knew about each
employee's credentials at the moment they were assigned to a shift.

---

## Table of contents

- [What it does](#what-it-does)
- [Why this exists](#why-this-exists)
- [The marquee feature](#the-marquee-feature)
- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [Local development](#local-development)
- [Demo accounts](#demo-accounts)
- [Project structure](#project-structure)
- [Data model at a glance](#data-model-at-a-glance)
- [Working features](#working-features)
- [Roadmap](#roadmap)
- [API security testing](#api-security-testing)
- [Development workflow](#development-workflow)
- [Companion book](#companion-book)
- [Acknowledgments](#acknowledgments)

---

## What it does

Three different people use MedCred Workforce, each through their own
portal:

**Healthcare workers** (nurses, respiratory therapists, certified
nursing assistants, medical assistants) apply to the platform with
their credentials. Once verified, they receive shift proposals from
facilities and confirm or decline them. They see exactly which shifts
they're eligible for and exactly why they're not eligible for others.

**Facilities** (hospitals, clinics) post shifts with role and
credential requirements. They see only candidates who pass the
credential check — the system filters out unqualified staff before any
human reviews them.

**Admins** review applications, approve or reject credentials, and
propose assignments. Every action is captured in an audit trail.

---

## Why this exists

Healthcare staffing has a compliance problem most platforms ignore.
Credentials expire. Certifications get revoked. Different shifts need
different qualifications. The standard industry approach is for an
overworked agency staffer to check a paper file before each
assignment.

MedCred Workforce inverts that: **the credential check happens in code
on every assignment**, and the result is captured as an immutable
record. There is no override. There is no manual bypass. Compliance is
the default, not an afterthought.

---

## The marquee feature

`src/lib/eligibility.ts` is a pure-function engine — zero framework
dependencies, fully unit-testable — that decides whether an employee
can be assigned to a shift. For each candidate, it evaluates:

1. **Type match** — Is the employee's role (RN, LPN, CNA, RT, MA) one
   of the shift's allowed types?
2. **Required credentials** — Does the employee have all of the
   credentials required by the shift? Required credentials are the
   union of:
   - The **baseline** for their role (e.g., every RN needs RN_LICENSE
     and BLS_CERTIFICATION) — stored as data in
     the `CredentialRequirement` table
   - **Per-shift extras** specified by the facility (e.g., this ICU
     shift also needs ACLS) — stored on the `Shift.extraRequiredCredentials`
     array
3. **Status & expiry** — Are those credentials APPROVED and
   non-expired on the shift's start date?
4. **Schedule conflict** — Is the employee already assigned to an
   overlapping shift?

The engine returns a structured result with eligibility status,
specific reasons for ineligibility, and the credentials that satisfied
the check.

When an admin proposes an assignment, that result is captured as an
**immutable JSON snapshot** on `ShiftAssignment.credentialCheckSnapshot`.
The snapshot answers, for any future audit:

- What did the system check at the moment of assignment?
- Which specific credentials satisfied the check?
- What were their statuses and expiry dates at that moment?

Subsequent changes to the underlying credentials don't retroactively
modify this record. The audit trail is permanent.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | The dominant full-stack React framework. App Router for modern server components. |
| Language | TypeScript | Type safety across the database, API, and UI. |
| Styling | Tailwind CSS 4 | Utility-first, fast to write, no separate stylesheet file to maintain. |
| Database | PostgreSQL (Neon) | Production-grade relational database, hosted free tier, serverless-friendly pooled connections. |
| ORM | Prisma 7 | Type-safe queries, migration management, generated TypeScript client. |
| Auth | NextAuth v5 (Auth.js) | Battle-tested. Handles JWT sessions, CSRF, password hashing integration. |
| Package manager | pnpm | Fast, disk-efficient, deterministic. |
| Validation | Zod | Runtime input validation that integrates with TypeScript types. |
| Hashing | bcryptjs | Industry-standard password hashing. |
| Type fonts | Inter Tight, JetBrains Mono | Modern sans-serif for everything; mono for credential numbers. |

---

## Architecture overview

### Request lifecycle (logged-in user)

```
Browser ─►  Next.js middleware  ─►  Route handler / Server component  ─►  Prisma  ─►  Postgres
            │                       │                                    │
            ├─ Verifies JWT cookie  ├─ Calls auth() to get session       └─ Singleton client
            ├─ Reads role from JWT  ├─ Checks role for authorization       (src/lib/prisma.ts)
            └─ Allows or rejects    └─ Renders UI / returns JSON
```

### Authentication architecture

NextAuth v5 requires a split configuration because Next.js middleware
runs in the **edge runtime**, which has restricted Node API access. We
solve this with two files:

- **`src/auth.config.ts`** — edge-safe configuration. Defines the
  `authorized` callback and JWT/session shape. Imported by middleware.
- **`src/auth.ts`** — full configuration extending `auth.config.ts`
  with the Credentials provider's `authorize` function (which uses
  bcrypt and Prisma — neither of which runs on the edge). Imported by
  server components and API routes.

The user's role is embedded in the JWT cookie at sign-in time, so the
middleware can authorize requests without database lookups. This is
both a performance win and a hard requirement of edge-runtime
constraints.

### Authorization model

Authorization is enforced at three layers — defense in depth:

1. **Middleware** — coarse-grained checks based on path and role from
   the JWT. Anonymous users get redirected to `/login`. Logged-in
   users hitting role-mismatched paths get redirected to `/dashboard`.
2. **Route handlers / server components** — fine-grained checks
   inside the function body. Each protected route re-checks the role
   even if the middleware already let it through. This catches
   middleware misconfigurations and provides the second layer.
3. **Database constraints** — for invariants the application can't be
   trusted to enforce alone (e.g., `@@unique([shiftId, employeeId])`
   prevents the same employee from being assigned to the same shift
   twice, regardless of any application bug).

### The compliance snapshot pattern

Used in `ShiftAssignment.credentialCheckSnapshot` (see
[The marquee feature](#the-marquee-feature)). The snapshot is a JSON
column populated at the moment of assignment and never updated. It
captures the full credential-check result so that future audits can
answer "what did the system know at the moment of assignment?"
regardless of what's true today.

---

## Local development

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **pnpm 9+** (`npm install -g pnpm` if not installed)
- **A Neon Postgres account** (free tier works; sign up at
  [neon.tech](https://neon.tech))

### Setup

Clone and install:

```bash
git clone https://github.com/JayRebusora/medcred-workforce.git
cd medcred-workforce
pnpm install
```

Create a `.env` file at the project root:

```env
# Postgres connection (use the POOLED connection string from Neon)
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# NextAuth
AUTH_SECRET="GENERATE_A_RANDOM_STRING_HERE"
AUTH_TRUST_HOST="true"
APP_BASE_URL="http://localhost:3000"
```

Generate a random `AUTH_SECRET`:

```bash
openssl rand -base64 32
# or, on Windows PowerShell:
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Apply the database schema and seed demo data:

```bash
pnpm dlx prisma migrate dev
pnpm dlx prisma db seed
```

Start the dev server:

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Available scripts

```bash
pnpm dev                       # Start the development server (Turbopack)
pnpm build                     # Build for production
pnpm start                     # Start the production server
pnpm lint                      # Run ESLint
pnpm dlx prisma studio         # Open Prisma Studio (database GUI)
pnpm dlx prisma migrate dev    # Apply schema changes
pnpm dlx prisma db seed        # Seed demo data (DESTRUCTIVE — wipes db)
```

---

## Demo accounts

After running the seed, four accounts exist:

| Role | Email | Password | Use case |
|---|---|---|---|
| Admin | `admin@medcred.com` | `admin123` | Reviews applications, approves credentials, proposes assignments |
| Facility | `hospital@medcred.com` | `client123` | Henry Memorial Hospital — posts shifts |
| Employee (verified) | `employee@medcred.com` | `employee123` | Nora Reyes, RN with approved credentials |
| Employee (pending) | `pending@medcred.com` | `employee123` | Peter Adams, credentials awaiting review |

Plus one applicant who hasn't yet been approved:

| Application | Email |
|---|---|
| Sarah Applicant | `sarah.applicant@example.com` |

---

## Project structure

```
medcred-workforce/
├── prisma/
│   ├── schema.prisma         # 12-model schema with 10 enums
│   ├── migrations/           # Migration history (committed to Git)
│   └── seed.ts               # Demo data seeder
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (app)/            # Authenticated routes (sidebar + topbar)
│   │   │   ├── dashboard/    # Role-routed dashboard
│   │   │   ├── shifts/       # Admin shift management
│   │   │   ├── my/           # Personal views (employee + facility)
│   │   │   └── ...
│   │   ├── (auth)/           # Public auth routes
│   │   │   └── login/
│   │   ├── api/              # API route handlers
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── applications/
│   │   │   ├── shifts/
│   │   │   ├── assignments/
│   │   │   └── setup-password/
│   │   ├── apply/            # Public applicant flow
│   │   ├── setup-password/   # Token-gated account setup
│   │   ├── globals.css       # Design system tokens
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Public landing page
│   ├── components/
│   │   ├── landing/          # Public landing page sections
│   │   └── shell/            # Authenticated app shell (sidebar, topbar)
│   ├── lib/
│   │   ├── prisma.ts         # Prisma Client singleton
│   │   ├── eligibility.ts    # Credential-aware engine (the marquee feature)
│   │   ├── tokens.ts         # Invite token generation + hashing
│   │   └── email.ts          # Mock email sender (console.log for now)
│   ├── types/
│   │   └── next-auth.d.ts    # Module augmentation for role on session
│   ├── auth.config.ts        # Edge-safe NextAuth config
│   ├── auth.ts               # Full NextAuth setup
│   └── middleware.ts         # Route protection
├── docs/
│   └── postman/              # API security test collection
├── .env                      # NOT COMMITTED — contains secrets
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

---

## Data model at a glance

Twelve models, designed around three key decisions:

**Separate User / Employee / Facility tables** (1:1). The `User` table
holds login data (email, passwordHash, role). Employees and facilities
have their own profile tables linked by `userId`. Admins exist only as
User rows. This keeps required fields actually required and avoids a
bloated User table with mostly-null columns.

**Hybrid credential requirements**. Per-role baselines live in the
`CredentialRequirement` table; per-shift extras live on
`Shift.extraRequiredCredentials` as a Postgres native enum array. The
engine takes the union when checking eligibility.

**Soft delete on audit-bearing tables**. `User`, `Employee`,
`Facility`, `Credential`, and `Shift` carry a nullable `deletedAt`
column rather than being hard-deleted. This preserves audit trails.
Ephemeral records (notifications, messages, invite tokens) are
hard-deleted normally.

Models:

```
User              ─┬─►  Employee     ─►  Credential
                   │                  └──►  ShiftAssignment ◄── Shift ◄── Facility
                   ├─►  Facility     
                   ├─►  Notification
                   ├─►  Message (sender + recipient)
                   └─►  AuditLog (actor)

Application       ─►  InviteToken (after approval, before account creation)

CredentialRequirement   (baseline matrix: EmployeeType ↔ CredentialType)
```

For the full schema, see [`prisma/schema.prisma`](./prisma/schema.prisma).

---

## Working features

As of milestone v0.2:

### Foundation
- [x] Next.js 16 + TypeScript + Tailwind 4 setup
- [x] Prisma 7 + Neon Postgres with 12-model schema, indexes, soft deletes
- [x] NextAuth v5 with JWT sessions and split edge-safe config
- [x] Middleware-based route protection (role-aware)
- [x] Three role-specific dashboards (admin, employee, facility)
- [x] Polished public landing page

### Applicant onboarding (end-to-end)
- [x] Three-step public application wizard at `/apply`
- [x] Admin review queue with status tabs (pending / approved / declined)
- [x] Approve action generates SHA-256-hashed invite token (48h TTL)
- [x] `/setup-password` token-gated account creation
- [x] Atomic creation of User + Employee/Facility profile + Credentials

### Shift management
- [x] Admin shift creation form with full requirement specification
- [x] Admin shifts list with status filters and pagination
- [x] **Credential-aware eligibility engine** (the marquee — see above)
- [x] Shift detail page with live eligibility results
- [x] Immutable compliance snapshot captured on assignment
- [x] Employee confirm / decline workflow
- [x] Facility self-serve shift requests with tenant isolation

### DevOps
- [x] GitHub Issues + milestones for project management
- [x] Postman collection with API security tests (saved at `docs/postman/`)
- [x] Conventional Commits, branch-per-feature, squash-merge workflow

---

## Roadmap

| Milestone | Status | Scope |
|---|---|---|
| v0.1 — Foundation + applicant flow | ✅ Complete | Setup, auth, dashboards, applicant onboarding |
| v0.2 — Shift management | ✅ Complete | Shift CRUD, eligibility engine, assignment lifecycle, multi-tenant facility flow |
| v0.3 — Credential management | 🚧 In progress | Employee credential upload + admin review queue |
| v0.4 — Messaging + notifications | ⬜ Planned | 1:1 messaging (polled, no realtime), notification triggers |
| v0.5 — Audit log | ⬜ Planned | Audit writes wired into admin actions, admin viewer page |
| v1.0 — Deployment + docs | ⬜ Planned | Vercel + Neon production, real Resend email, daily expiring-credentials cron, capstone deliverables |

---

## API security testing

Eight Postman requests under
[`docs/postman/medcred-api.postman_collection.json`](./docs/postman/)
verify role-based access controls and tenant isolation at the API
level (independent of the UI):

- `PATCH /assignments/[id]` returns **404** when a different employee
  tries to modify someone else's assignment (no information leak)
- `PATCH /assignments/[id]` returns **409** when trying to confirm an
  already-confirmed assignment
- `PATCH /assignments/[id]` returns **401** when called by an admin
  (employee-only endpoint)
- `POST /shifts` returns **400** when an admin omits `facilityId`
- `POST /shifts` **silently rewrites** any `facilityId` in the body to
  the session's facility when called by a CLIENT (tenant isolation)
- `POST /shifts` returns **401** when called by an employee

Import the collection in Postman to reproduce the tests against your
local instance. You'll need to update the cookie values in the
collection's environment after each session.

---

## Development workflow

This project follows a kanban-style workflow modeled on a small
engineering team:

1. **Every unit of work is a GitHub Issue** with acceptance criteria
   and labels.
2. **Branch per feature**: `feat/`, `fix/`, `refactor/`, `docs/`, or
   `ops/` prefix matching the work type.
3. **Conventional Commits** for messages:
   `feat(shifts): add credential-aware engine`.
4. **Pull request closes the issue**: PR description includes
   `Closes #N` to auto-close on merge.
5. **Self-review the diff** before merging.
6. **Squash-merge** to keep `main`'s history linear.
7. **Update `PROGRESS.md` and `CHANGELOG.md`** at milestone boundaries.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full process
description.

---

## Companion book

A book-length walkthrough of how this project was built — *Building
MedCred Workforce* — is being written in parallel. It's a chapter-by-
chapter narrative covering everything from project setup through the
eligibility engine, written for readers who know JavaScript basics but
haven't built a full-stack app before.

The book is in active drafting; chapters complete as of this writing:

- Preface, audience note, and TOC
- Chapter 1: From Zero to a Running Next.js Project
- Chapter 2: Cleaning the Slate
- Chapter 3: Thinking in Tables
- Chapter 4: Prisma and Neon
- Chapter 5: Seeding Realistic Data
- Chapter 6: Understanding Authentication

Eventually the book will compile to a single PDF.

---

## Acknowledgments

Built by **Jay Rebusora** as a capstone project, with **Claude**
(Anthropic) as a pair-programming partner and writing collaborator.

Every architectural decision, design call, and merged commit was made
by Jay; Claude served as a sounding board, code reviewer, and drafting
partner — analogous to working with a senior engineer who's available
24/7 but doesn't take ownership.

Inspired by real workflows in healthcare staffing agencies, where
credential compliance is too often a manual, error-prone process. The
goal was to demonstrate that compliance can be a structural feature of
the software, not a paperwork add-on.

---

## License

This project is for educational and capstone purposes. Not licensed
for commercial use without permission.
