export function HowItWorks() {
  return (
    <section id="how" className="section bg-soft">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="How it works"
          title="From application to first shift in days, not weeks."
          subtitle="A credential-first onboarding flow that matches the rhythm of healthcare hiring."
        />

        <ol className="relative mt-16 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
          {/* Connecting line on desktop */}
          <div
            aria-hidden
            className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px"
            style={{ background: "var(--color-line)" }}
          />

          <Step
            n={1}
            title="Apply"
            body="Submit your role, credentials, and contact info in a 3-step form. No account needed yet."
          />
          <Step
            n={2}
            title="Get verified"
            body="An admin reviews your submission. Approved applicants receive a 48-hour secure invite link."
          />
          <Step
            n={3}
            title="Get matched"
            body="Our engine surfaces the shifts you're qualified for. We block what you're not — automatically."
          />
          <Step
            n={4}
            title="Work shifts"
            body="Confirm or decline proposed assignments. Every match is logged for compliance forever."
          />
        </ol>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="relative">
      <div className="flex md:flex-col items-start gap-4">
        <StepBadge n={n} />
        <div className="md:mt-2">
          <h3 className="display text-2xl text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted max-w-[260px]">
            {body}
          </p>
        </div>
      </div>
    </li>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div
      className="relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 z-10"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-line)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span className="display text-2xl text-ink">{n}</span>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="display mt-3 text-4xl md:text-5xl">{title}</h2>
      {subtitle && (
        <p className="mt-4 text-base text-muted leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
