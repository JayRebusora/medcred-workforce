type InviteEmailInput = {
  to: string;
  firstName: string;
  setupUrl: string;
};

type DeclineEmailInput = {
  to: string;
  firstName: string;
  note?: string;
};

export async function sendInviteEmail({
  to,
  firstName,
  setupUrl,
}: InviteEmailInput): Promise<void> {
  // In production, replace with Resend's API call.
  console.log("━".repeat(70));
  console.log("📧  [MOCK EMAIL] Invite sent");
  console.log("  To:      ", to);
  console.log("  Subject: ", "Welcome to MedCred — set up your account");
  console.log("  Body:");
  console.log(
    `    Hi ${firstName}, your application was approved. Click the link`,
  );
  console.log(`    below to set your password and access your portal.`);
  console.log(`    Link: ${setupUrl}`);
  console.log(`    This link expires in 48 hours.`);
  console.log("━".repeat(70));
}

export async function sendDeclineEmail({
  to,
  firstName,
  note,
}: DeclineEmailInput): Promise<void> {
  console.log("━".repeat(70));
  console.log("📧  [MOCK EMAIL] Application declined");
  console.log("  To:      ", to);
  console.log("  Subject: ", "Update on your MedCred application");
  console.log("  Body:");
  console.log(`    Hi ${firstName}, thank you for your interest. After review`);
  console.log(`    we are unable to move forward with your application.`);
  if (note) console.log(`    Note from the reviewer: ${note}`);
  console.log("━".repeat(70));
}

/** Get the public base URL for building absolute links inside emails. */
export function getAppBaseUrl(): string {
  // In dev: localhost:3000. In prod: NEXTAUTH_URL or similar.
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}
