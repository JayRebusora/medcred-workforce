# GitHub Issue Backlog

Copy-paste each issue below into GitHub Issues one at a time.
Use the labels as listed. Assign each to the right milestone.

---

## Milestone: v0.2 — Shift management

### Issue #1 — Admin: shift creation form

**Labels:** `feature`, `area:shifts`, `role:admin`, `priority:high`

**Description**
As an admin, I need to create a shift at a facility so that employees can be assigned to it.

**Acceptance criteria**
- [ ] Route `/shifts/new` accessible to admins only (middleware guard + route handler check)
- [ ] Form fields: facility (dropdown), title, description (optional), start datetime, end datetime, allowed employee types (multi-select), extra required credentials (multi-select), hourly rate (optional)
- [ ] `POST /api/shifts` endpoint with Zod validation
- [ ] Validation: endAt > startAt, allowedEmployeeTypes non-empty
- [ ] On submit, redirect to shift detail page
- [ ] Shift status defaults to `OPEN`

**Out of scope**
- Recurring shifts (one-off only for MVP)

---

### Issue #2 — Admin: shifts list page

**Labels:** `feature`, `area:shifts`, `role:admin`, `priority:high`

**Description**
Admin needs to see all shifts across all facilities with filtering.

**Acceptance criteria**
- [ ] Route `/shifts` — paginated table
- [ ] Filter tabs: OPEN / ASSIGNED / IN_PROGRESS / COMPLETED / CANCELLED
- [ ] Columns: title, facility, start, duration, allowed types, status, assigned employee (if any)
- [ ] Click row → navigate to `/shifts/[id]`
- [ ] "New shift" button top-right
- [ ] Sort by start datetime ascending by default

---

### Issue #3 — Shift detail page with credential-aware assignment

**Labels:** `feature`, `area:shifts`, `area:credentials`, `priority:critical`

**Description**
The marquee feature of the platform. Admin views a shift, sees a list of eligible employees (with live credential check results), and can propose an assignment.

**Acceptance criteria**
- [ ] Route `/shifts/[id]` — admin sees full detail; facility sees read-only view of their own shifts
- [ ] **Eligibility engine** (lib function): given a shift and list of employees, compute for each employee:
  - Type match: is their `employeeType` in `shift.allowedEmployeeTypes`?
  - Credential match: do they have all (per-type baseline ∪ per-shift extras) credentials, APPROVED, non-expired on `shift.startAt`?
  - Returns `{ eligible: boolean, missing: CredentialType[], expiring: CredentialType[] }`
- [ ] UI shows eligible employees (green), ineligible with reason (red)
- [ ] "Propose assignment" button creates `ShiftAssignment` with `credentialCheckSnapshot` captured from the engine output
- [ ] Snapshot is a JSON blob matching the schema design: `{ checkedAt, required, verified, missing }`
- [ ] `POST /api/shifts/[id]/assign` endpoint backing this action
- [ ] Shift status updates to `ASSIGNED` on successful assignment

**Technical notes**
- This is the feature most worth demoing. Make sure the snapshot capture is obviously visible in Prisma Studio after an assignment.

---

### Issue #4 — Employee shift confirmation

**Labels:** `feature`, `area:shifts`, `role:employee`, `priority:medium`

**Description**
When an admin proposes an assignment, the employee sees it in their dashboard and can confirm or decline.

**Acceptance criteria**
- [ ] Employee's `/my/shifts` page shows pending assignments with "Confirm" and "Decline" buttons
- [ ] `PATCH /api/assignments/[id]` with action `CONFIRM` or `DECLINE`
- [ ] Confirm moves status to `CONFIRMED`; decline moves to `DECLINED` + shift goes back to `OPEN`
- [ ] Employee sees confirmed shifts on their dashboard (already implemented in employee dashboard card)

---

### Issue #5 — Facility: shift request page

**Labels:** `feature`, `area:shifts`, `role:client`, `priority:medium`

**Description**
Facilities can request new shifts (which then appear in the admin's inbox for approval/creation).

**Acceptance criteria**
- [ ] Route `/my/shifts` (facility view) — lists their existing shifts + "Request new" button
- [ ] Request form creates a shift directly in OPEN status (simplification for MVP — no separate request/approval step)
- [ ] Facility can only create shifts for their own facility
- [ ] Same underlying endpoint as #1, but backend enforces `facilityId` matches session's facility

---

## Milestone: v0.3 — Credential management

### Issue #6 — Employee: credential list + upload

**Labels:** `feature`, `area:credentials`, `role:employee`, `priority:high`

**Description**
Employees manage their own credentials — view status, add new ones, renew expiring ones.

**Acceptance criteria**
- [ ] Route `/my/credentials` — table of own credentials
- [ ] Columns: type, number, issuing body, issued, expires, status
- [ ] "Add credential" button opens form (same fields as application claim)
- [ ] `POST /api/credentials` endpoint — employee-scoped (no picking other employees)
- [ ] New credentials default to PENDING status
- [ ] "Renew" button on expiring credentials (creates a new credential record, doesn't overwrite)

**Out of scope for now**
- Actual file uploads via UploadThing (use a text URL field for MVP)

---

### Issue #7 — Admin: credential review queue

**Labels:** `feature`, `area:credentials`, `role:admin`, `priority:high`

**Description**
Admin reviews pending credentials and approves or rejects with a note.

**Acceptance criteria**
- [ ] Route `/credentials` — filter tabs (PENDING / APPROVED / REJECTED / EXPIRED)
- [ ] Each row shows employee name, credential type, number, expiry, status
- [ ] Click row → detail page with "Approve" / "Reject" buttons + note field
- [ ] `PATCH /api/credentials/[id]` endpoint with action APPROVE / REJECT and optional note
- [ ] Approved credentials are now usable for shift eligibility checks (already wired via the engine in issue #3)
- [ ] Rejection requires a note

---

## Milestone: v0.4 — Messaging + notifications

### Issue #8 — Direct messaging (thin, polled)

**Labels:** `feature`, `area:messaging`, `priority:medium`

**Description**
Basic 1:1 messaging between users. Polling, no real-time (Pusher is deferred post-capstone).

**Acceptance criteria**
- [ ] Route `/messages` — thread list (other users the current user has exchanged messages with)
- [ ] Click a thread → view page with message history, newest at bottom
- [ ] Send new message via form at bottom of thread
- [ ] `GET /api/messages?threadWith=[userId]` and `POST /api/messages`
- [ ] Mark messages as read when thread is opened (`readAt` timestamp)
- [ ] Unread message count shown in sidebar

---

### Issue #9 — Notifications list page

**Labels:** `feature`, `area:notifications`, `priority:medium`

**Description**
Users see in-app notifications in a dedicated page.

**Acceptance criteria**
- [ ] Route `/notifications` — table of own notifications
- [ ] Newest first
- [ ] Click a notification with `linkUrl` → navigate there + mark read
- [ ] "Mark all read" button
- [ ] `GET /api/notifications` and `PATCH /api/notifications/[id]`

---

### Issue #10 — Wire notification triggers into existing flows

**Labels:** `feature`, `area:notifications`, `priority:medium`

**Description**
Emit notifications when domain events happen.

**Acceptance criteria**
- [ ] Credential APPROVED → notify the employee
- [ ] Credential REJECTED → notify the employee (with note from admin)
- [ ] Shift assignment PROPOSED → notify the employee
- [ ] Application status change → notify the applicant via the existing email path (no in-app notification since they don't have an account yet)
- [ ] Helper `createNotification()` added to `src/lib/notifications.ts`

---

## Milestone: v0.5 — Audit log

### Issue #11 — Write audit entries in admin actions

**Labels:** `feature`, `area:audit`, `priority:medium`

**Description**
Every admin action should leave an audit record.

**Acceptance criteria**
- [ ] `lib/audit.ts` helper with `writeAuditLog({ actorId, action, entityType, entityId, summary, beforeState?, afterState? })`
- [ ] Called from:
  - Application approve/decline
  - Credential approve/reject
  - Shift create/update
  - Shift assignment
  - User create/delete
- [ ] Captures IP address and user agent when possible (from request headers)

---

### Issue #12 — Admin audit log viewer

**Labels:** `feature`, `area:audit`, `role:admin`, `priority:low`

**Description**
Admin-only page to browse the audit trail.

**Acceptance criteria**
- [ ] Route `/audit` — paginated table
- [ ] Filters: actor (user dropdown), action, entity type, date range
- [ ] Click row → expand to show `beforeState` / `afterState` JSON
- [ ] `GET /api/audit` with query params

---

## Milestone: v1.0 — Deployment & docs

### Issue #13 — Deploy to Vercel + Neon production

**Labels:** `ops`, `priority:high`

**Acceptance criteria**
- [ ] Vercel project created, connected to GitHub repo
- [ ] Environment variables configured (DATABASE_URL, AUTH_SECRET, AUTH_TRUST_HOST, APP_BASE_URL)
- [ ] Neon production branch (separate from dev) with `prisma migrate deploy`
- [ ] Seeded admin user (not the default demo accounts)
- [ ] Working prod URL accessible
- [ ] HTTPS working (Vercel default)

---

### Issue #14 — Real email via Resend

**Labels:** `feature`, `area:email`, `priority:medium`

**Acceptance criteria**
- [ ] Resend account + API key in env
- [ ] Sender domain verified OR use Resend onboarding sender for demo
- [ ] `src/lib/email.ts` swapped from console log to real Resend calls
- [ ] Console-log fallback if `RESEND_API_KEY` not set (dev convenience)

---

### Issue #15 — Cron: daily expiring-credentials scan

**Labels:** `feature`, `area:credentials`, `ops`, `priority:low`

**Acceptance criteria**
- [ ] Endpoint `GET /api/cron/credential-scan` protected by `CRON_SECRET`
- [ ] Logic: find APPROVED credentials with `expiryDate` within 30 days OR past → emit notifications
- [ ] Past-expiry credentials → status updated to EXPIRED
- [ ] Configured in `vercel.json` with `0 8 * * *` schedule
- [ ] Idempotent (won't duplicate notifications on re-run)

---

### Issue #16 — Capstone README & architecture doc

**Labels:** `docs`, `priority:high`

**Acceptance criteria**
- [ ] README covers: overview, features per role, tech stack, how to run locally, demo account credentials, deployed URL
- [ ] `docs/architecture.md` with: high-level diagram (Mermaid), data model ERD (mermaid), request flow for 1-2 key features (applicant onboarding, shift assignment)
- [ ] `docs/api.md` listing every API route with method, path, auth requirement, request/response shape
- [ ] Changelog up to date

---

### Issue #17 — Demo video walkthrough

**Labels:** `docs`, `priority:medium`

**Acceptance criteria**
- [ ] 5–7 minute screen recording demonstrating:
  - Applicant applies → admin reviews → approves → applicant receives link → sets password → logs in
  - Admin creates a shift → runs credential-aware assignment → employee sees confirmed shift
  - Credential expiry warning flow (can fake by setting expiry in past in Studio)
- [ ] Uploaded to YouTube or Loom, link in README

---

### Issue #18 — Critical-path tests

**Labels:** `quality`, `priority:low`

**Acceptance criteria**
- [ ] Vitest or Jest configured
- [ ] Tests for:
  - `lib/tokens.ts` — hash determinism, expiry logic
  - Credential eligibility engine (happy path + missing credential + expired credential)
  - Application submission schema validation
- [ ] `pnpm test` passes in CI (GitHub Actions)

---

## Labels to create in GitHub

Before creating issues, set up these labels in your repo (Settings → Labels):

| Name | Color | Description |
|---|---|---|
| `feature` | `#0e8a16` | New functionality |
| `bug` | `#d73a4a` | Something isn't working |
| `docs` | `#0075ca` | Documentation |
| `quality` | `#fbca04` | Tests, refactors, tech debt |
| `ops` | `#5319e7` | Deployment, infra, CI |
| `area:shifts` | `#c2e0c6` | Shift management |
| `area:credentials` | `#c2e0c6` | Credential management |
| `area:messaging` | `#c2e0c6` | Messaging |
| `area:notifications` | `#c2e0c6` | Notifications |
| `area:audit` | `#c2e0c6` | Audit log |
| `area:email` | `#c2e0c6` | Email |
| `role:admin` | `#bfd4f2` | Admin portal |
| `role:employee` | `#bfd4f2` | Employee portal |
| `role:client` | `#bfd4f2` | Facility portal |
| `priority:critical` | `#b60205` | Must have |
| `priority:high` | `#e99695` | Should have |
| `priority:medium` | `#fef2c0` | Nice to have |
| `priority:low` | `#e4e669` | If time permits |
