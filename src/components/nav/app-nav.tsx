"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, GraduationCap, House, Target } from "lucide-react";

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

/** Anton-Wortmarke, 4 Zeilen, 10 px. */
function Wortmarke() {
  return (
    <p className="shrink-0 font-heading text-[10px] leading-[1.05] text-eco-deep-green uppercase">
      The
      <br />
      Academy
      <br />
      for climate
      <br />
      jobs
    </p>
  );
}

function Programm({ name, mobile }: { name: string; mobile?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-8 min-w-0 items-center gap-2 border-l border-border pl-4",
        mobile && "flex-1"
      )}
    >
      <GraduationCap className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span
        className={cn(
          "text-muted-foreground",
          mobile ? "truncate text-xs" : "text-[13px] whitespace-nowrap"
        )}
      >
        {name}
      </span>
    </div>
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
        {/* Desktop */}
        <div className="hidden h-16 items-center gap-4 px-8 md:flex">
          <Wortmarke />
          {programmeName.trim() && <Programm name={programmeName} />}
          <nav aria-label="Hauptnavigation" className="ml-auto">
            <ul className="flex items-center gap-1">
              {ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-2 rounded-lg px-3.5 text-[15px] transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none",
                        FOKUS,
                        active
                          ? "bg-eco-green/10 font-semibold text-eco-deep-green"
                          : "text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green"
                      )}
                    >
                      <Icon
                        className={cn("size-[18px] shrink-0", active && "text-eco-green")}
                        aria-hidden="true"
                      />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {menu}
        </div>

        {/* Mobile: Kopf ohne Nav, Nav als Bottom-Bar unten */}
        <div className="flex h-[60px] items-center gap-3 px-4 md:hidden">
          <Wortmarke />
          {programmeName.trim() ? <Programm name={programmeName} mobile /> : <span className="flex-1" />}
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
                      active && "bg-eco-green/10"
                    )}
                  >
                    <Icon
                      className={cn("size-5", active && "text-eco-green")}
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
