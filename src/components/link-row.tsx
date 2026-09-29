import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Link-Zeile am Kartenende (Handoff 2a): min-h-12, border-t, Text +
 * ArrowRight in Eco Green, Hover hellgrün. Nur verwenden, wenn es ein echtes
 * Ziel gibt ("Ohne Zielseite kein Hover und kein Pfeil").
 */
export function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-between gap-3 border-t border-border px-4 text-sm font-medium text-eco-deep-green outline-none transition-[background-color] duration-150 hover:bg-eco-green/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-eco-green motion-reduce:transition-none"
    >
      {children}
      <ArrowRight className="size-4 shrink-0 text-eco-green" aria-hidden="true" />
    </Link>
  );
}
