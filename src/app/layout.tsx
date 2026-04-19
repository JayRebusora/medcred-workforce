// src/app/layout.tsx
// Root layout. Loads three Google fonts via next/font:
//   - Instrument Serif (display, hero typography)
//   - Inter Tight      (UI body, forms, tables, buttons)
//   - JetBrains Mono   (credential IDs and monospace accents)
// Fonts expose as CSS variables so they work in Tailwind classes and arbitrary CSS.

import type { Metadata } from "next";
import {
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedCred Workforce",
  description: "Healthcare staffing with credential compliance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
