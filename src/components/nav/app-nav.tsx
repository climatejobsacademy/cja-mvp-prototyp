"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Target } from "lucide-react";

import { AccountMenu } from "@/components/nav/account-menu";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/schedule", label: "Mein Schedule", icon: CalendarDays },
  { href: "/kompetenzen", label: "Kompetenzen", icon: Target },
  { href: "/content", label: "Content Library", icon: BookOpen },
];

const NAV_ITEM_CLASSES =
  "flex w-full flex-col items-center gap-0.5 px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors sm:flex-row sm:gap-1.5 sm:py-3 sm:text-sm";

export function AppNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="sticky bottom-0 z-10 border-t border-border bg-background sm:sticky sm:top-0 sm:border-t-0 sm:border-b"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2 pr-3 sm:px-4">
        <ul className="flex flex-1 justify-around sm:justify-start sm:gap-2">
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
        </ul>
        {/* Account-/Profil-Menü: rechtsbündig, letztes Element der Top-Nav
            (docs/design-specifications.md, Abschnitt "Account-/Profil-Menü"). */}
        <AccountMenu name={name} email={email} />
      </div>
    </nav>
  );
}
