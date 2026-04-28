import "./globals.css";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body-loaded",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono-loaded",
});

export const metadata = {
  title: "MedCred Workforce — Credentialed healthcare staffing",
  description:
    "Apply, get verified, and work shifts at hospitals that need you. " +
    "MedCred matches credentialed healthcare professionals to facilities " +
    "with compliance built in.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body
        style={
          {
            ["--font-display" as string]: `var(--font-body-loaded), -apple-system, system-ui, sans-serif`,
            ["--font-body" as string]: `var(--font-body-loaded), -apple-system, system-ui, sans-serif`,
            ["--font-mono" as string]: `var(--font-mono-loaded), "SF Mono", Menlo, monospace`,
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
