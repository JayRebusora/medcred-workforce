// prisma/seed.ts
// Seeds the database with an admin, the credential requirement matrix,
// and a small set of demo data for the three portals.
//
// Run with: pnpm dlx prisma db seed
// (prisma.config.ts should reference this file under `migrations.seed`.)

import {
  PrismaClient,
  Role,
  EmployeeType,
  CredentialType,
  CredentialStatus,
  ShiftStatus,
  AssignmentStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Baseline credential requirements per employee type.
// Shifts can require EXTRA credentials on top of these.
const CREDENTIAL_MATRIX: Record<EmployeeType, CredentialType[]> = {
  REGISTERED_NURSE: [
    CredentialType.RN_LICENSE,
    CredentialType.BLS_CERTIFICATION,
  ],
  LICENSED_PRACTICAL_NURSE: [
    CredentialType.LPN_LICENSE,
    CredentialType.BLS_CERTIFICATION,
  ],
  CERTIFIED_NURSING_ASSISTANT: [
    CredentialType.CNA_CERTIFICATION,
    CredentialType.BLS_CERTIFICATION,
  ],
  RESPIRATORY_THERAPIST: [
    CredentialType.RT_LICENSE,
    CredentialType.BLS_CERTIFICATION,
  ],
  MEDICAL_ASSISTANT: [CredentialType.MA_CERTIFICATION],
};

// Utility: date N days from now (negative = in the past)
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

async function main() {
  console.log("🌱  Seeding database…");

  // Wipe in reverse-dependency order. Safe because seed is authoritative in dev.
  console.log("  → Clearing existing data");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.credentialRequirement.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.application.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.user.deleteMany();

  // ─── Credential requirement matrix ───────────────────────────────
  console.log("  → Creating credential requirement matrix");
  for (const [type, required] of Object.entries(CREDENTIAL_MATRIX)) {
    for (const cred of required) {
      await prisma.credentialRequirement.create({
        data: {
          employeeType: type as EmployeeType,
          credentialType: cred,
        },
      });
    }
  }

  // ─── Admin user ──────────────────────────────────────────────────
  console.log("  → Creating admin user");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@medcred.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      firstName: "Ada",
      lastName: "Admin",
    },
  });

  // ─── Demo facility (client portal user) ──────────────────────────
  console.log("  → Creating demo facility");
  const facilityPasswordHash = await bcrypt.hash("client123", 10);
  const facilityUser = await prisma.user.create({
    data: {
      email: "hospital@medcred.com",
      passwordHash: facilityPasswordHash,
      role: Role.CLIENT,
      firstName: "Henry",
      lastName: "Hospital",
      facility: {
        create: {
          name: "Riverside General Hospital",
          addressLine1: "100 Riverside Drive",
          city: "Philadelphia",
          state: "PA",
          zipCode: "19103",
          facilityType: "HOSPITAL",
        },
      },
    },
    include: { facility: true },
  });

  // ─── Second demo facility (for multi-tenant testing) ─────────────
  console.log("  → Creating second demo facility");
  const secondFacilityPasswordHash = await bcrypt.hash("client123", 10);
  await prisma.user.create({
    data: {
      email: "otherhospital@medcred.com",
      passwordHash: secondFacilityPasswordHash,
      role: Role.CLIENT,
      firstName: "Other",
      lastName: "Hospital",
      facility: {
        create: {
          name: "Second General Hospital",
          addressLine1: "200 Second Street",
          city: "Harrisburg",
          state: "PA",
          zipCode: "17101",
          facilityType: "HOSPITAL",
        },
      },
    },
  });

  // ─── Demo employee 1: fully approved, ready to work ──────────────
  console.log("  → Creating demo employee (approved)");
  const employeePasswordHash = await bcrypt.hash("employee123", 10);
  const employeeUser = await prisma.user.create({
    data: {
      email: "employee@medcred.com",
      passwordHash: employeePasswordHash,
      role: Role.EMPLOYEE,
      firstName: "Nora",
      lastName: "Nurse",
      phone: "555-0100",
      employee: {
        create: {
          employeeType: EmployeeType.REGISTERED_NURSE,
          yearsOfExperience: 5,
          bio: "ICU-certified RN with 5 years experience.",
          credentials: {
            create: [
              {
                type: CredentialType.RN_LICENSE,
                credentialNumber: "RN-PA-123456",
                issuingBody: "Pennsylvania State Board of Nursing",
                issuedDate: daysFromNow(-365),
                expiryDate: daysFromNow(365),
                status: CredentialStatus.APPROVED,
                reviewedAt: daysFromNow(-350),
                reviewedById: admin.id,
              },
              {
                type: CredentialType.BLS_CERTIFICATION,
                credentialNumber: "BLS-789012",
                issuingBody: "American Heart Association",
                issuedDate: daysFromNow(-180),
                expiryDate: daysFromNow(550),
                status: CredentialStatus.APPROVED,
                reviewedAt: daysFromNow(-170),
                reviewedById: admin.id,
              },
            ],
          },
        },
      },
    },
    include: { employee: { include: { credentials: true } } },
  });

  // ─── Demo employee 2: pending credential review ──────────────────
  console.log("  → Creating demo employee (pending review)");
  const pendingPasswordHash = await bcrypt.hash("employee123", 10);
  await prisma.user.create({
    data: {
      email: "pending@medcred.com",
      passwordHash: pendingPasswordHash,
      role: Role.EMPLOYEE,
      firstName: "Peter",
      lastName: "Pending",
      phone: "555-0101",
      employee: {
        create: {
          employeeType: EmployeeType.REGISTERED_NURSE,
          yearsOfExperience: 2,
          bio: "New hire — credentials under review.",
          credentials: {
            create: [
              {
                type: CredentialType.RN_LICENSE,
                credentialNumber: "RN-PA-999999",
                issuingBody: "Pennsylvania State Board of Nursing",
                issuedDate: daysFromNow(-30),
                expiryDate: daysFromNow(700),
                status: CredentialStatus.PENDING,
              },
              // Intentionally missing BLS — shows up as non-eligible for RN shifts
            ],
          },
        },
      },
    },
  });

  // ─── Demo applicant (pending review) ─────────────────────────────────
  console.log("  → Creating demo applicant (Sarah, pending review)");
  await prisma.application.create({
    data: {
      roleType: Role.EMPLOYEE,
      email: "sarah.applicant@example.com",
      firstName: "Sarah",
      lastName: "Applicant",
      phone: "555-0200",
      employeeType: EmployeeType.REGISTERED_NURSE,
      yearsOfExperience: 3,
      documents: [
        {
          type: CredentialType.RN_LICENSE,
          credentialNumber: "RN-PA-445566",
          issuingBody: "Pennsylvania State Board of Nursing",
          issuedDate: daysFromNow(-60).toISOString().slice(0, 10),
          expiryDate: daysFromNow(700).toISOString().slice(0, 10),
        },
        {
          type: CredentialType.BLS_CERTIFICATION,
          credentialNumber: "BLS-334455",
          issuingBody: "American Heart Association",
          issuedDate: daysFromNow(-90).toISOString().slice(0, 10),
          expiryDate: daysFromNow(640).toISOString().slice(0, 10),
        },
      ],
      // status defaults to PENDING
    },
  });

  // ─── Demo shifts ─────────────────────────────────────────────────
  console.log("  → Creating demo shifts");
  const facility = facilityUser.facility!;

  // Open shift — future, no assignment yet
  await prisma.shift.create({
    data: {
      facilityId: facility.id,
      title: "Night shift — ICU",
      description: "12-hour ICU night coverage, ACLS required.",
      startAt: daysFromNow(3),
      endAt: daysFromNow(3 + 0.5),
      allowedEmployeeTypes: [EmployeeType.REGISTERED_NURSE],
      extraRequiredCredentials: [CredentialType.ACLS_CERTIFICATION],
      hourlyRate: 65,
      status: ShiftStatus.OPEN,
    },
  });

  // Assigned shift — Nora assigned, credential check passed
  const noraEmployee = employeeUser.employee!;
  const noraCreds = noraEmployee.credentials;
  await prisma.shift.create({
    data: {
      facilityId: facility.id,
      title: "Day shift — Med/Surg",
      description: "Standard medical-surgical day coverage.",
      startAt: daysFromNow(5),
      endAt: daysFromNow(5 + 0.33),
      allowedEmployeeTypes: [EmployeeType.REGISTERED_NURSE],
      extraRequiredCredentials: [],
      hourlyRate: 55,
      status: ShiftStatus.ASSIGNED,
      assignments: {
        create: {
          employeeId: noraEmployee.id,
          status: AssignmentStatus.CONFIRMED,
          credentialCheckPassed: true,
          credentialCheckSnapshot: {
            checkedAt: new Date().toISOString(),
            required: [
              CredentialType.RN_LICENSE,
              CredentialType.BLS_CERTIFICATION,
            ],
            verified: noraCreds.map((c) => ({
              id: c.id,
              type: c.type,
              status: c.status,
              expiryDate: c.expiryDate.toISOString(),
            })),
            missing: [],
          },
          assignedById: admin.id,
        },
      },
    },
  });

  // Completed shift — historical record
  await prisma.shift.create({
    data: {
      facilityId: facility.id,
      title: "Day shift — Med/Surg",
      description: "Completed shift from last week.",
      startAt: daysFromNow(-7),
      endAt: daysFromNow(-7 + 0.33),
      allowedEmployeeTypes: [EmployeeType.REGISTERED_NURSE],
      extraRequiredCredentials: [],
      hourlyRate: 55,
      status: ShiftStatus.COMPLETED,
      assignments: {
        create: {
          employeeId: noraEmployee.id,
          status: AssignmentStatus.COMPLETED,
          credentialCheckPassed: true,
          credentialCheckSnapshot: {
            checkedAt: daysFromNow(-8).toISOString(),
            required: [
              CredentialType.RN_LICENSE,
              CredentialType.BLS_CERTIFICATION,
            ],
            verified: noraCreds.map((c) => ({
              id: c.id,
              type: c.type,
              status: c.status,
              expiryDate: c.expiryDate.toISOString(),
            })),
            missing: [],
          },
          assignedById: admin.id,
        },
      },
    },
  });

  console.log("✅  Seed complete.\n");
  console.log("Demo accounts:");
  console.log("  Admin    → admin@medcred.com     / admin123");
  console.log("  Employee → employee@medcred.com  / employee123  (approved)");
  console.log(
    "  Employee → pending@medcred.com   / employee123  (pending review)",
  );
  console.log("  Client   → hospital@medcred.com  / client123");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
