import type { Metadata } from "next";
import { Anton, Geist_Mono, Work_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Fließtext, UI-Labels, Formulare — docs/design-specifications.md, Abschnitt 1
const workSans = Work_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Headlines/Hero/CTA-Labels — reine Display-Schrift, bewusst nicht für Fließtext
const anton = Anton({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AfCJ Qualifizierungsplattform",
  description: "Lernplattform für Elektrofachkraft Erneuerbare Energien",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="de"
      className={`${workSans.variable} ${anton.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
