MedCred Workforce

Healthcare staffing built around credentials, not calendars.

🌐 Live demo: medcred-workforce.vercel.app
A full-stack web application that matches credentialed healthcare workers
to hospital shifts, with credential-aware compliance enforced in code.
This is a capstone project built to demonstrate end-to-end full-stack
engineering: schema design, authentication, role-aware access control,
domain modeling, and a marquee feature — an immutable compliance
snapshot that records exactly what the system knew about each
employee's credentials at the moment they were assigned to a shift.

Try the demo
Visit medcred-workforce.vercel.app and
sign in with any of these accounts:
RoleEmailPasswordBest for showcasingAdminadmin@medcred.comadmin123Application review, credential approval, shift creation, eligibility engineFacilityhospital@medcred.comclient123Self-serve shift requests, tenant-scoped viewsEmployee (verified)employee@medcred.comemployee123Personal shift view, credential management, renewal flowEmployee (pending)pending@medcred.comemployee123What an under-credentialed employee experiences
A pending application (Sarah Applicant, sarah.applicant@example.com) sits in the admin's review queue — approving her demonstrates the invite-token-based onboarding flow.
Walkthrough suggestion: sign in as Admin → Applications → approve Sarah's application → copy the generated invite URL from the toast notification → open it in an incognito window → set a password → sign in as Sarah.

Table of contents

What it does
Why this exists
The marquee feature
Tech stack
Architecture overview
Local development
Demo accounts
Project structure
Data model at a glance
Working features
Roadmap
API security testing
Development workflow
Companion book
Acknowledgments

What it does
Three different people use MedCred Workforce, each through their own
portal:
Healthcare workers (nurses, respiratory therapists, certified
nursing assistants, medical assistants) apply to the platform with
their credentials. Once verified, they receive shift proposals from
facilities and confirm or decline them. They see exactly which shifts
they're eligible for and exactly why they're not eligible for others.
Facilities (hospitals, clinics) post shifts with role and
credential requirements. They see only candidates who pass the
credential check — the system filters out unqualified staff before any
human reviews them.
Admins review applications, approve or reject credentials, and
propose assignments. Every action is captured in an audit trail.

Why this exists
Healthcare staffing has a compliance problem most platforms ignore.
Credentials expire. Certifications get revoked. Different shifts need
different qualifications. The standard industry approach is for an
overworked agency staffer to check a paper file before each
assignment.
MedCred Workforce inverts that: the credential check happens in code
on every assignment, and the result is captured as an immutable
record. There is no override. There is no manual bypass. Compliance is
the default, not an afterthought.

The marquee feature
src/lib/eligibility.ts is a pure-function engine — zero framework
dependencies, fully unit-testable — that decides whether an employee
can be assigned to a shift. For each candidate, it evaluates:

Type match — Is the employee's role (RN, LPN, CNA, RT, MA) one
of the shift's allowed types?
Required credentials — Does the employee have all of the
credentials required by the shift? Required credentials are the
union of:

The baseline for their role (e.g., every RN needs RN_LICENSE
and BLS_CERTIFICATION) — stored as data in
the CredentialRequirement table
Per-shift extras specified by the facility (e.g., this ICU
shift also needs ACLS) — stored on the Shift.extraRequiredCredentials
array

Status & expiry — Are those credentials APPROVED and
non-expired on the shift's start date?
Schedule conflict — Is the employee already assigned to an
overlapping shift?

The engine returns a structured result with eligibility status,
specific reasons for ineligibility, and the credentials that satisfied
the check.
When an admin proposes an assignment, that result is captured as an
immutable JSON snapshot on ShiftAssignment.credentialCheckSnapshot.
The snapshot answers, for any future audit:

What did the system check at the moment of assignment?
Which specific credentials satisfied the check?
What were their statuses and expiry dates at that moment?

Subsequent changes to the underlying credentials don't retroactively
modify this record. The audit trail is permanent.

Tech stack
LayerChoiceWhyFrameworkNext.js 16 (App Router)The dominant full-stack React framework. App Router for modern server components.LanguageTypeScriptType safety across the database, API, and UI.StylingTailwind CSS 4Utility-first, fast to write, no separate stylesheet file to maintain.DatabasePostgreSQL (Neon)Production-grade relational database, hosted free tier, serverless-friendly pooled connections.ORMPrisma 7Type-safe queries, migration management, generated TypeScript client.AuthNextAuth v5 (Auth.js)Battle-tested. Handles JWT sessions, CSRF, password hashing integration.HostingVercelServerless Next.js hosting with GitHub auto-deploy.Package managerpnpmFast, disk-efficient, deterministic.ValidationZodRuntime input validation that integrates with TypeScript types.HashingbcryptjsIndustry-standard password hashing.Type fontsInter Tight, JetBrains MonoModern sans-serif for everything; mono for credential numbers.

Architecture overview
Request lifecycle (logged-in user)
Browser ─► Next.js proxy (edge) ─► Route handler / Server component ─► Prisma ─► Postgres
│ │ │
├─ Verifies JWT cookie ├─ Calls auth() to get session └─ Singleton client
├─ Reads role from JWT ├─ Checks role for authorization (src/lib/prisma.ts)
└─ Allows or rejects └─ Renders UI / returns JSON
Authentication architecture
NextAuth v5 requires a split configuration because Next.js proxy
runs in the edge runtime, which has restricted Node API access. We
solve this with two files:

src/auth.config.ts — edge-safe configuration. Defines the
authorized callback and JWT/session shape. Imported by proxy.
src/auth.ts — full configuration extending auth.config.ts
with the Credentials provider's authorize function (which uses
bcrypt and Prisma — neither of which runs on the edge). Imported by
server components and API routes.

The user's role is embedded in the JWT cookie at sign-in time, so the
proxy can authorize requests without database lookups. This is
both a performance win and a hard requirement of edge-runtime
constraints.
Authorization model
Authorization is enforced at three layers — defense in depth:

Proxy — coarse-grained checks based on path and role from
the JWT. Anonymous users get redirected to /login. Logged-in
users hitting role-mismatched paths get redirected to /dashboard.
Route handlers / server components — fine-grained checks
inside the function body. Each protected route re-checks the role
even if the proxy already let it through. This catches
proxy misconfigurations and provides the second layer.
Database constraints — for invariants the application can't be
trusted to enforce alone (e.g., @@unique([shiftId, employeeId])
prevents the same employee from being assigned to the same shift
twice, regardless of any application bug).

The compliance snapshot pattern
Used in ShiftAssignment.credentialCheckSnapshot (see
The marquee feature). The snapshot is a JSON
column populated at the moment of assignment and never updated. It
captures the full credential-check result so that future audits can
answer "what did the system know at the moment of assignment?"
regardless of what's true today.
Production environment
The deployed app runs on Vercel, served from medcred-workforce.vercel.app.
The database is hosted on Neon, in a Postgres branch labeled production,
separate from the dev branch used during local development. Every push
to main triggers a production deployment automatically; pushes to feature
branches generate preview deployments at unique URLs.

Local development
Prerequisites

Node.js 20+ (LTS recommended)
pnpm 9+ (npm install -g pnpm if not installed)
A Neon Postgres account (free tier works; sign up at
neon.tech)

Setup
Clone and install:
bashgit clone https://github.com/JayRebusora/medcred-workforce.git
cd medcred-workforce
pnpm install
Create a .env file at the project root:
env# Postgres connection (use the POOLED connection string from Neon)
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# NextAuth

AUTH_SECRET="GENERATE_A_RANDOM_STRING_HERE"
AUTH_TRUST_HOST="true"
APP_BASE_URL="http://localhost:3000"
Generate a random AUTH_SECRET:
bashnode -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
Apply the database schema and seed demo data:
bashpnpm dlx prisma migrate deploy
pnpm dlx prisma db seed
Start the dev server:
bashpnpm dev
Visit http://localhost:3000.
Available scripts
bashpnpm dev # Start the development server (Turbopack)
pnpm build # Build for production
pnpm start # Start the production server
pnpm lint # Run ESLint
pnpm dlx prisma studio # Open Prisma Studio (database GUI)
pnpm dlx prisma migrate dev # Apply schema changes
pnpm dlx prisma db seed # Seed demo data (DESTRUCTIVE — wipes db)

Demo accounts
After running the seed, four accounts exist:
RoleEmailPasswordUse caseAdminadmin@medcred.comadmin123Reviews applications, approves credentials, proposes assignmentsFacilityhospital@medcred.comclient123Henry Memorial Hospital — posts shiftsEmployee (verified)employee@medcred.comemployee123Nora Reyes, RN with approved credentialsEmployee (pending)pending@medcred.comemployee123Peter Adams, credentials awaiting review
Plus one applicant who hasn't yet been approved:
ApplicationEmailSarah Applicantsarah.applicant@example.com

Project structure
medcred-workforce/
├── prisma/
│ ├── schema.prisma # 12-model schema with 10 enums
│ ├── migrations/ # Migration history (committed to Git)
│ └── seed.ts # Demo data seeder
├── src/
│ ├── app/ # Next.js App Router
│ │ ├── (app)/ # Authenticated routes (sidebar + topbar)
│ │ │ ├── dashboard/ # Role-routed dashboard
│ │ │ ├── shifts/ # Admin shift management
│ │ │ ├── credentials/ # Admin credential review queue
│ │ │ ├── my/ # Personal views (employee + facility)
│ │ │ └── ...
│ │ ├── (auth)/ # Public auth routes
│ │ │ └── login/
│ │ ├── api/ # API route handlers
│ │ ├── apply/ # Public applicant flow
│ │ ├── setup-password/ # Token-gated account setup
│ │ ├── globals.css # Design system tokens
│ │ ├── layout.tsx # Root layout
│ │ ├── page.tsx # Public landing page
│ │ ├── not-found.tsx # Custom 404
│ │ └── error.tsx # Global error boundary
│ ├── components/
│ │ ├── landing/ # Public landing page sections
│ │ └── shell/ # Authenticated app shell (sidebar, topbar)
│ ├── lib/
│ │ ├── prisma.ts # Prisma Client singleton
│ │ ├── eligibility.ts # Credential-aware engine (the marquee feature)
│ │ ├── tokens.ts # Invite token generation + hashing
│ │ └── email.ts # Mock email sender (console.log for now)
│ ├── types/
│ │ └── next-auth.d.ts # Module augmentation for role on session
│ ├── auth.config.ts # Edge-safe NextAuth config
│ ├── auth.ts # Full NextAuth setup
│ └── proxy.ts # Route protection (was middleware.ts pre-Next.js 16)
├── docs/
│ └── postman/ # API security test collection
├── .env # NOT COMMITTED — contains secrets
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md # This file

Data model at a glance
Twelve models, designed around three key decisions:
Separate User / Employee / Facility tables (1:1). The User table
holds login data (email, passwordHash, role). Employees and facilities
have their own profile tables linked by userId. Admins exist only as
User rows. This keeps required fields actually required and avoids a
bloated User table with mostly-null columns.
Hybrid credential requirements. Per-role baselines live in the
CredentialRequirement table; per-shift extras live on
Shift.extraRequiredCredentials as a Postgres native enum array. The
engine takes the union when checking eligibility.
Soft delete on audit-bearing tables. User, Employee,
Facility, Credential, and Shift carry a nullable deletedAt
column rather than being hard-deleted. This preserves audit trails.
Ephemeral records (notifications, messages, invite tokens) are
hard-deleted normally.
Models:
User ─┬─► Employee ─► Credential
│ └──► ShiftAssignment ◄── Shift ◄── Facility
├─► Facility
├─► Notification
├─► Message (sender + recipient)
└─► AuditLog (actor)

Application ─► InviteToken (after approval, before account creation)

CredentialRequirement (baseline matrix: EmployeeType ↔ CredentialType)
For the full schema, see prisma/schema.prisma.

Working features
As of milestone v1.0:
Foundation

Next.js 16 + TypeScript + Tailwind 4 setup
Prisma 7 + Neon Postgres with 12-model schema, indexes, soft deletes
NextAuth v5 with JWT sessions and split edge-safe config
Proxy-based route protection (role-aware)
Three role-specific dashboards (admin, employee, facility)
Polished public landing page

Applicant onboarding (end-to-end)

Three-step public application wizard at /apply
Admin review queue with status tabs (pending / approved / declined)
Approve action generates SHA-256-hashed invite token (48h TTL)
/setup-password token-gated account creation
Atomic creation of User + Employee/Facility profile + Credentials

Shift management

Admin shift creation form with full requirement specification
Admin shifts list with status filters and pagination
Credential-aware eligibility engine (the marquee — see above)
Shift detail page with live eligibility results
Immutable compliance snapshot captured on assignment
Employee confirm / decline workflow
Facility self-serve shift requests with tenant isolation

Credential management

Employee credential list at /my/credentials with status, expiry warnings, renewal flow
POST /api/credentials employee-scoped endpoint, defaults to PENDING
Admin credential review queue at /credentials with status filter tabs
Admin Approve / Reject actions with required note on rejection
Rejected credentials display the admin's note inline on the employee's list

Deployment

Live on Vercel at medcred-workforce.vercel.app
Production database on Neon (production branch)
GitHub Actions / Vercel auto-deploy on push to main
Custom 404 and 500 error pages

DevOps

GitHub Issues + milestones for project management
Postman collection with 14 API security tests (saved at docs/postman/)
Conventional Commits, branch-per-feature, squash-merge workflow

Roadmap
MilestoneStatusScopev0.1 — Foundation + applicant flow✅ CompleteSetup, auth, dashboards, applicant onboardingv0.2 — Shift management✅ CompleteShift CRUD, eligibility engine, assignment lifecycle, multi-tenant facility flowv0.3 — Credential management✅ CompleteEmployee submission, admin review queue with notes, renewal flowv1.0 — Deployment + docs✅ CompleteVercel + Neon production deployment, capstone README, custom error pagesv0.4 — Messaging + notifications⬜ Future1:1 messaging (polled, no realtime), notification triggersv0.5 — Audit log⬜ FutureAudit writes wired into admin actions, admin viewer pagev0.6 — Admin tooling⬜ FutureRead-only directories for employees, facilities, users

API security testing
Postman requests under
docs/postman/medcred-api.postman_collection.json
verify role-based access controls and tenant isolation at the API
level (independent of the UI). Coverage:

PATCH /api/assignments/[id] — 404 on ownership violation, 409 on duplicate confirm, 401 on wrong role
POST /api/shifts — 400 on missing facilityId, silent tenant rewrite, 401 on employee
POST /api/credentials — 201 on employee, 401 on admin/facility/anonymous, 400 on invalid type, 400 on expiry before issued
PATCH /api/credentials/[id] — 200 on admin approve, 200 on admin reject with note, 409 on already-approved, 400 on reject without note, 401 on wrong role

Import the collection in Postman to reproduce. You'll need to update
the cookie values in the collection's environment after each session.

Development workflow
This project follows a kanban-style workflow modeled on a small
engineering team:

Every unit of work is a GitHub Issue with acceptance criteria
and labels.
Branch per feature: feat/, fix/, refactor/, docs/, or
ops/ prefix matching the work type.
Conventional Commits for messages:
feat(shifts): add credential-aware engine.
Pull request closes the issue: PR description includes
Closes #N to auto-close on merge.
Self-review the diff before merging.
Squash-merge to keep main's history linear.
Update PROGRESS.md and CHANGELOG.md at milestone boundaries.

See CONTRIBUTING.md for the full process
description.

Companion book
A book-length walkthrough of how this project was built — Building
MedCred Workforce — is being written in parallel. It's a chapter-by-
chapter narrative covering everything from project setup through the
eligibility engine, written for readers who know JavaScript basics but
haven't built a full-stack app before.
The book is in active drafting; chapters complete as of this writing:

Preface, audience note, and TOC
Chapter 1: From Zero to a Running Next.js Project
Chapter 2: Cleaning the Slate
Chapter 3: Thinking in Tables
Chapter 4: Prisma and Neon
Chapter 5: Seeding Realistic Data
Chapter 6: Understanding Authentication

Eventually the book will compile to a single PDF.

Acknowledgments
Built by Jay Rebusora as a capstone project, with Claude
(Anthropic) as a pair-programming partner and writing collaborator.
Every architectural decision, design call, and merged commit was made
by Jay; Claude served as a sounding board, code reviewer, and drafting
partner — analogous to working with a senior engineer who's available
24/7 but doesn't take ownership.
Inspired by real workflows in healthcare staffing agencies, where
credential compliance is too often a manual, error-prone process. The
goal was to demonstrate that compliance can be a structural feature of
the software, not a paperwork add-on.

License
This project is for educational and capstone purposes. Not licensed
for commercial use without permission.
