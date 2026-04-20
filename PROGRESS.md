# MedCred Workforce — Progress

Last updated: **{{ update_date }}**

This table tracks the build status of every major area of the project.
Status legend: ✅ Done · 🚧 In progress · ⬜ Planned · ❌ Out of scope

## Overall

| Area | Status | % Complete |
|---|:-:|:-:|
| Foundation (schema, auth, app shell) | ✅ | 100% |
| Applicant onboarding flow | ✅ | 100% |
| Employee credential management | ⬜ | 0% |
| Shift management + credential-aware assignment | ⬜ | 0% |
| Messaging (direct 1:1) | ⬜ | 0% |
| Notifications center | ⬜ | 0% |
| Audit log (writes + viewer) | 🚧 | 20% (schema only) |
| Cron: expiring credentials scan | ⬜ | 0% |
| Deployment to Vercel + Neon | ⬜ | 0% |
| Documentation & capstone deliverables | 🚧 | 30% |
| **Overall** | **🚧** | **≈ 45%** |

## Foundation — complete

| Feature | Status | Notes |
|---|:-:|---|
| Next.js 16 + TypeScript + Tailwind 4 setup | ✅ | |
| Prisma 7 + Neon Postgres | ✅ | 12-model schema, indexed, seeded |
| NextAuth v5 with JWT sessions | ✅ | Credentials provider, role on session |
| Middleware route protection | ✅ | Role-aware, proxy.ts in Next 16 |
| App shell (sidebar + topbar) | ✅ | Role-aware nav |
| Three role-specific dashboards | ✅ | Admin / Employee / Client, live Prisma data |
| Public landing page | ✅ | |
| Login page | ✅ | Inline error states |

## Applicant onboarding — complete

| Feature | Status | Notes |
|---|:-:|---|
| 3-step application wizard (public) | ✅ | Role-branching, credential claim |
| `POST /api/applications` | ✅ | Zod-validated, idempotency on email |
| Admin applications list with status tabs | ✅ | PENDING / APPROVED / DECLINED |
| Admin review + approve/decline | ✅ | With required note for decline |
| `PATCH /api/applications/[id]` | ✅ | Admin-only, generates invite token |
| Invite token with SHA-256 hash storage | ✅ | 48h TTL, single-use |
| Mock email sender (console log) | ✅ | Will swap for Resend before deploy |
| `/setup-password` token-gated page | ✅ | |
| `POST /api/setup-password` | ✅ | Atomic User + Employee/Facility + Credentials creation |

## Credential management — planned

| Feature | Status | Issue |
|---|:-:|:-:|
| Employee `/my/credentials` page | ⬜ | — |
| Upload new credential (stub URL for now) | ⬜ | — |
| Admin `/credentials` review queue | ⬜ | — |
| Approve / reject credential with note | ⬜ | — |
| Credential expiry computed live (derived EXPIRED state) | ⬜ | — |

## Shift management — planned (next up)

| Feature | Status | Issue |
|---|:-:|:-:|
| Admin shift creation form | ⬜ | — |
| Facility shift request page | ⬜ | — |
| Credential-aware assignment engine | ⬜ | — |
| Assignment snapshot (JSON compliance record) | ⬜ | — |
| Employee shift confirmation / decline | ⬜ | — |
| Shift calendar view | ⬜ | — |

## Messaging & notifications — planned (thin version)

| Feature | Status | Issue |
|---|:-:|:-:|
| Message thread list | ⬜ | — |
| Send / receive message (poll, not realtime) | ⬜ | — |
| Notifications list page | ⬜ | — |
| Notification triggers wired into existing flows | ⬜ | — |

## Audit log — partial

| Feature | Status | Issue |
|---|:-:|:-:|
| `AuditLog` model in schema | ✅ | Already defined |
| Write audit entries inside admin actions | ⬜ | — |
| Admin `/audit` viewer page | ⬜ | — |

## Non-functional — planned

| Feature | Status | Issue |
|---|:-:|:-:|
| Deployment to Vercel + Neon (prod URL) | ⬜ | — |
| Real email via Resend | ⬜ | — |
| Vercel cron: daily expiring-credentials scan | ⬜ | — |
| Capstone README & architecture document | 🚧 | — |
| Demo video / walkthrough | ⬜ | — |
| Test suite (Jest or Vitest, at least critical paths) | ⬜ | — |

---

## Roadmap

| Milestone | Target | Status |
|---|---|:-:|
| v0.1 — Foundation + Applicant flow | Completed | ✅ |
| v0.2 — Shift management + credential-aware assignment | Next sprint | 🚧 |
| v0.3 — Credential management | Next sprint | ⬜ |
| v0.4 — Messaging + notifications (thin) | Next sprint | ⬜ |
| v0.5 — Audit log writes + viewer | Next sprint | ⬜ |
| v1.0 — Deployment + Resend + capstone docs | Release | ⬜ |
