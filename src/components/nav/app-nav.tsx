"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, LogOut, Target } from "lucide-react";

import { signOut } from "@/app/(learner)/actions";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/schedule", label: "Mein Schedule", icon: CalendarDays },
  { href: "/kompetenzen", label: "Kompetenzen", icon: Target },
  { href: "/content", label: "Content Library", icon: BookOpen },
];

// Gemeinsame Klassen für Link- und Button-Nav-Items -- Logout ist keine
// Route, deshalb eigenes <button>/<form> statt <Link>, aber optisch
// identisch zu den übrigen Items behandelt (SR-16: kein neues Nav-Element
// erfinden, bestehende Navigation wiederverwendet statt z. B. ein eigenes
// User-Menü einzuführen).
const NAV_ITEM_CLASSES =
  "flex w-full flex-col items-center gap-0.5 px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors sm:flex-row sm:gap-1.5 sm:py-3 sm:text-sm";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="sticky bottom-0 z-10 border-t border-border bg-background sm:sticky sm:top-0 sm:border-t-0 sm:border-b"
    >
      <ul className="mx-auto flex max-w-2xl justify-around sm:justify-start sm:gap-2 sm:px-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 sm:flex-none">
              <Link
                href={href}
                className={cn(NAV_ITEM_CLASSES, active && "text-primary")}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5 sm:size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex-1 sm:flex-none">
          <form action={signOut}>
            <button type="submit" className={NAV_ITEM_CLASSES}>
              <LogOut className="size-5 sm:size-4" aria-hidden="true" />
              Abmelden
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
