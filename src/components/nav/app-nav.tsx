"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, House, Target } from "lucide-react";

import { AccountMenu } from "@/components/nav/account-menu";
import { cn } from "@/lib/utils";

// Handoff 2a (docs/design_handoff_lernplattform/README.md, "Kopfleiste").
// /home ist neu (Redesign-Schritt c).
const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/schedule", label: "Stundenplan", icon: Calendar },
  { href: "/kompetenzen", label: "Kompetenzen", icon: Target },
  { href: "/content", label: "Programm", icon: BookOpen },
];

const FOKUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Anton-Wortmarke, 4 Zeilen, 10 px -- Link auf Home (zusätzlich zum Nav-Punkt). */
function Wortmarke() {
  return (
    <Link
      href="/home"
      aria-label="The Academy for Climate Jobs – zur Startseite"
      className={cn("flex min-h-11 shrink-0 items-center rounded-lg", FOKUS)}
    >
      <span
        aria-hidden="true"
        className="font-heading text-[10px] leading-[1.05] text-eco-deep-green uppercase"
      >
        The
        <br />
        Academy
        <br />
        for climate
        <br />
        jobs
      </span>
    </Link>
  );
}

export function AppNav({
  name,
  email,
  programmeName,
  cohortName,
}: {
  name: string;
  email: string;
  programmeName: string;
  cohortName: string;
}) {
  const pathname = usePathname();
  const menu = <AccountMenu name={name} email={email} programmeName={programmeName} cohortName={cohortName} />;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-white">
        {/* Desktop (Home v12, docs/design_handoff_home_v6/design/home-v12-referenz.html): Logo
            links, Navigation als Segmented Control in der Mitte, Avatar
            rechts. Programmname steht nicht mehr im Kopf (Entscheidung
            Anna 2026-10-10), sondern im Kompetenz-Panel bzw. Account-Menü. */}
        <div className="mx-auto hidden max-w-[1080px] items-center gap-6 px-10 py-3 md:flex">
          <div className="flex min-w-0 flex-1">
            <Wortmarke />
          </div>
          <nav aria-label="Hauptnavigation">
            <ul className="flex items-center gap-0.5 rounded-xl bg-off-white p-1">
              {ITEMS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center rounded-[9px] px-4 text-sm transition-[background-color,box-shadow,color] duration-150 motion-reduce:transition-none",
                        FOKUS,
                        active
                          ? "bg-white font-semibold text-eco-deep-green shadow-sm"
                          : "text-muted-foreground hover:text-eco-deep-green"
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex flex-1 justify-end">{menu}</div>
        </div>

        {/* Mobile: Kopf ohne Nav, Nav als Bottom-Bar unten */}
        <div className="flex h-[60px] items-center justify-between gap-3 px-4 md:hidden">
          <Wortmarke />
          {menu}
        </div>
      </header>

      <nav
        aria-label="Hauptnavigation"
        data-bottom-nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-xs",
                    FOKUS,
                    active ? "font-semibold text-eco-deep-green" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[30px] w-14 items-center justify-center rounded-full transition-[background-color] duration-150 motion-reduce:transition-none",
                      active && "bg-off-white"
                    )}
                  >
                    <Icon
                      className={cn("size-5", active && "text-eco-deep-green")}
                      aria-hidden="true"
                    />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
