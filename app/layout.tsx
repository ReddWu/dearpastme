import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dear Past Me",
  description: "Meet a few possible versions of your future self.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning on html + body absorbs the attribute mismatches
    // browser extensions (translate, accessibility, password managers) inject
    // before React hydrates. The warning only suppresses one level deep, which
    // is exactly what we want — real component bugs still surface normally.
    <html lang="en" className={fraunces.variable} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
