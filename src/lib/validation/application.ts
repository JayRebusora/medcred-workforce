// Zod schemas for application submission. Shared between the client form
// (for inline validation) and the API route (for security — never trust
// client validation alone).

import { z } from "zod";
import { EmployeeType, Role, CredentialType } from "@prisma/client";

// A single credential "claim" the applicant submits. No file yet —
// they'll upload real docs after they onboard and have a User account.
export const applicationCredentialSchema = z.object({
  type: z.nativeEnum(CredentialType),
  credentialNumber: z.string().min(1).max(100).optional(),
  issuingBody: z.string().min(1).max(200).optional(),
  issuedDate: z.string().date("Invalid issue date"), // YYYY-MM-DD
  expiryDate: z.string().date("Invalid expiry date"),
});

export const applicationSchema = z
  .object({
    // Step 1: who + contact
    roleType: z.enum([Role.EMPLOYEE, Role.CLIENT]),
    firstName: z.string().trim().min(1, "Required").max(100),
    lastName: z.string().trim().min(1, "Required").max(100),
    email: z.string().trim().toLowerCase().email("Invalid email"),
    phone: z.string().trim().max(30).optional(),

    // Step 2A: employee-only
    employeeType: z.nativeEnum(EmployeeType).optional(),
    yearsOfExperience: z.coerce.number().int().min(0).max(70).optional(),
    credentials: z.array(applicationCredentialSchema).optional(),

    // Step 2B: facility-only
    facilityName: z.string().trim().max(200).optional(),
    addressLine1: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(50).optional(),
    zipCode: z.string().trim().max(20).optional(),
  })
  // Cross-field validation: required shape depends on roleType
  .superRefine((data, ctx) => {
    if (data.roleType === "EMPLOYEE") {
      if (!data.employeeType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Employee type is required",
          path: ["employeeType"],
        });
      }
      if (data.yearsOfExperience === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Years of experience is required",
          path: ["yearsOfExperience"],
        });
      }
    } else if (data.roleType === "CLIENT") {
      for (const field of [
        "facilityName",
        "addressLine1",
        "city",
        "state",
        "zipCode",
      ] as const) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required",
            path: [field],
          });
        }
      }
    }
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ApplicationCredentialInput = z.infer<
  typeof applicationCredentialSchema
>;
