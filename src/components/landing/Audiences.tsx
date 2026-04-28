import Link from "next/link";
import { SectionHeader } from "./HowItWorks";

export function Audiences() {
  return (
    <section id="audiences" className="section bg-soft">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Who it's for"
          title="One platform, two sides."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
          <AudienceCard
            kicker="For healthcare workers"
            title="Get paid for what you're qualified to do."
            bullets={[
              "Apply once; get verified faster than most agencies",
              "See exactly which shifts you can take and why",
              "Confirm or decline proposed shifts on your terms",
            ]}
            cta={{
              href: "/apply?role=employee",
              label: "Apply as a clinician",
            }}
          />
          <AudienceCard
            kicker="For facilities"
            title="Staff your shifts without the credential fire-drills."
            bullets={[
              "Post shifts with role and credential requirements",
              "We surface only qualified candidates — credentials checked",
              "Every assignment carries an immutable compliance record",
            ]}
            cta={{ href: "/apply?role=facility", label: "Apply as a facility" }}
            inverted
          />
        </div>
      </div>
    </section>
  );
}

function AudienceCard({
  kicker,
  title,
  bullets,
  cta,
  inverted = false,
}: {
  kicker: string;
  title: string;
  bullets: string[];
  cta: { href: string; label: string };
  inverted?: boolean;
}) {
  return (
    <div
      className="rounded-3xl p-8 md:p-10 flex flex-col justify-between"
      style={{
        background: inverted ? "var(--color-ink)" : "var(--color-card)",
        color: inverted ? "white" : "var(--color-text)",
        border: inverted
          ? "1px solid var(--color-ink)"
          : "1px solid var(--color-line)",
        boxShadow: "var(--shadow)",
        minHeight: 360,
      }}
    >
      <div>
        <div
          className="eyebrow"
          style={{
            color: inverted ? "rgba(255,255,255,0.6)" : "var(--color-muted)",
          }}
        >
          {kicker}
        </div>
        <h3
          className="display mt-3 text-3xl md:text-4xl"
          style={{ color: inverted ? "white" : "var(--color-ink)" }}
        >
          {title}
        </h3>

        <ul className="mt-8 space-y-3">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 text-sm leading-relaxed"
              style={{
                color: inverted ? "rgba(255,255,255,0.8)" : "var(--color-text)",
              }}
            >
              <span
                className="mt-1.5 inline-block w-1 h-1 rounded-full shrink-0"
                style={{
                  background: inverted
                    ? "rgba(255,255,255,0.5)"
                    : "var(--color-mute-2)",
                }}
              />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 text-sm font-medium group"
          style={{ color: inverted ? "white" : "var(--color-ink)" }}
        >
          {cta.label}
          <span className="inline-block transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
