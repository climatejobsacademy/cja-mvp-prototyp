"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, House, Target } from "lucide-react";

import { AccountMenu } from "@/components/nav/account-menu";
import type { HeaderLogo } from "@/lib/org-logo";
import { cn } from "@/lib/utils";

// Kopfleiste wie demo (Home v12, docs/design_handoff_home_v6/design/home-v12-referenz.html;
// Paket 3 B): Wortmarke und Logo der eigenen Organisation links (SR-76),
// Navigation als Segmented Control in der Mitte, Avatar mit Konto-Menü
// rechts (SR-77: "Profil bearbeiten"). Der Programmname steht nicht mehr im
// Kopf (Entscheidung Anna 2026-10-10), sondern im Konto-Menü. Keine Glocke,
// kein Chat-Knopf.
const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/schedule", label: "Stundenplan", icon: Calendar },
  { href: "/kompetenzen", label: "Kompetenzen", icon: Target },
  { href: "/content", label: "Programm", icon: BookOpen },
];

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Anton-Wortmarke, 4 Zeilen, 10 px -- Link auf die Startseite des Bereichs (Home bzw. /trainer). */
export function Wortmarke({ href = "/home" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="The Academy for Climate Jobs – zur Startseite"
      className={cn("flex min-h-11 shrink-0 items-center rounded-lg", FOKUS)}
    >
      <span aria-hidden="true" className="font-heading text-[10px] leading-[1.05] text-ink uppercase">
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

/**
 * Logo der eigenen Organisation (SR-76) hinter einem Trennstrich. Fester Kasten
 * (mobil kleiner): kein Layout-Sprung beim Laden, object-contain verzerrt nicht.
 * unoptimized: Datei kommt direkt aus dem öffentlichen Bucket, ohne
 * remotePatterns in next.config.ts. Ohne Logo bleibt der Platz leer.
 */
function OrgLogo({ logo, mobile }: { logo: HeaderLogo; mobile?: boolean }) {
  return (
    <div className={cn("flex shrink-0 items-center border-l border-line", mobile ? "h-7 pl-3" : "h-8 pl-4")}>
      <div className={cn("relative", mobile ? "h-6 w-[72px]" : "h-8 w-[120px]")}>
        <Image
          src={logo.src}
          alt={logo.alt}
          fill
          unoptimized
          sizes={mobile ? "72px" : "120px"}
          className="object-contain object-left"
        />
      </div>
    </div>
  );
}

export function AppNav({
  name,
  rufname,
  fotoUrl,
  email,
  programmeName,
  cohortName,
  organisationLogo,
}: {
  name: string;
  rufname: string;
  fotoUrl: string | null;
  email: string;
  programmeName: string;
  cohortName: string;
  organisationLogo: HeaderLogo | null;
}) {
  const pathname = usePathname();
  const menu = (
    <AccountMenu
      name={name}
      rufname={rufname}
      fotoUrl={fotoUrl}
      email={email}
      programmeName={programmeName}
      cohortName={cohortName}
    />
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        {/* Desktop: Wortmarke + Logo links, Navigation in der Mitte, Avatar rechts. */}
        <div className="mx-auto hidden max-w-[1120px] items-center gap-6 px-10 py-3 md:flex">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Wortmarke />
            {organisationLogo && <OrgLogo logo={organisationLogo} />}
          </div>
          <nav aria-label="Hauptnavigation">
            <ul className="flex items-center gap-0.5 rounded-full bg-white p-1 shadow-card">
              {ITEMS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center rounded-full px-4 text-sm transition-[background-color,box-shadow,color] duration-150 motion-reduce:transition-none",
                        FOKUS,
                        active ? "bg-brand font-semibold text-white" : "text-ink-muted hover:text-ink"
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
        <div className="flex h-[60px] items-center gap-3 px-4 md:hidden">
          <Wortmarke />
          {organisationLogo && <OrgLogo logo={organisationLogo} mobile />}
          <span className="flex-1" />
          {menu}
        </div>
      </header>

      <nav
        aria-label="Hauptnavigation"
        data-bottom-nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
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
                    active ? "font-semibold text-brand" : "text-ink-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[30px] w-14 items-center justify-center rounded-full transition-[background-color] duration-150 motion-reduce:transition-none",
                      active && "bg-brand-tint"
                    )}
                  >
                    <Icon className={cn("size-5", active && "text-brand")} aria-hidden="true" />
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
