"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Zwei Bereiche für Trainer:innen (SR-81, SR-82): Termine des Tages und
// Praxisberichte. Segmented Control wie die Lernenden-Navigation.
const ITEMS = [
  { href: "/trainer", label: "Heute", aktiv: (p: string) => p === "/trainer" },
  { href: "/trainer/berichte", label: "Praxisberichte", aktiv: (p: string) => p.startsWith("/trainer/berichte") },
];

export function TrainerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Bereiche">
      <ul className="flex items-center gap-0.5 rounded-full bg-white p-1 shadow-card">
        {ITEMS.map(({ href, label, aktiv }) => {
          const ist = aktiv(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ist ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center rounded-full px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                  ist ? "bg-brand font-semibold text-white" : "text-ink-muted hover:text-ink"
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
