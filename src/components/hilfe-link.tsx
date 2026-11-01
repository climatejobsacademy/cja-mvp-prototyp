"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Link zur Hilfe-Seite (Anna 2026-11-01, SR folgt). /hilfe liegt im
// Lernenden-Bereich -- auf Login und im Trainer-Bereich deshalb ausgeblendet,
// dort würde der Link nur zurück zum Login bzw. nach /trainer führen.
export function HilfeLink({ className, children = "Hilfe" }: { className?: string; children?: React.ReactNode }) {
  const pfad = usePathname();
  if (pfad.startsWith("/login") || pfad.startsWith("/auth") || pfad.startsWith("/trainer")) return null;
  return (
    <Link href="/hilfe" className={className}>
      {children}
    </Link>
  );
}
