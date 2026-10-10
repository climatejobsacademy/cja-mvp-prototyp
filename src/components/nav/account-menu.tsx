"use client";

import { GraduationCap, LogOut, Users } from "lucide-react";

import { signOut } from "@/app/(learner)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialFor(name: string, email: string) {
  const trimmedName = name.trim();
  if (trimmedName) {
    return trimmedName[0]!.toUpperCase();
  }
  return (email.trim()[0] ?? "?").toUpperCase();
}

function InfoZeile({
  icon: Icon,
  label,
  wert,
}: {
  icon: typeof GraduationCap;
  label: string;
  wert: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-[18px] shrink-0 text-eco-deep-green" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm leading-snug font-medium text-eco-deep-green">{wert}</span>
      </div>
    </div>
  );
}

/**
 * Account-/Profil-Menü (Handoff 2a, "Avatar-Menü"): Kopf mit Name + E-Mail,
 * Info-Zeilen Programm/Kohorte (nicht klickbar, kein Hover), einziger
 * Menüpunkt "Abmelden".
 */
export function AccountMenu({
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
  const initial = initialFor(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account-Menü"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-eco-deep-green text-sm font-semibold text-white outline-none transition-[background-color,box-shadow] duration-150 hover:bg-eco-deep-green/85 focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2 data-popup-open:ring-2 data-popup-open:ring-eco-green data-popup-open:ring-offset-2 motion-reduce:transition-none"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[300px] max-w-[calc(100vw-2rem)] rounded-xl p-0 shadow-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 p-4 font-normal">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[15px] font-semibold text-eco-deep-green"
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-semibold text-eco-deep-green">{name}</span>
              <span className="truncate text-[13px] text-muted-foreground">{email}</span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {/* Nur anzeigen, was die Daten hergeben -- leere Werte werden weggelassen. */}
        {(programmeName.trim() || cohortName.trim()) && (
          <div className="flex flex-col gap-3 border-t border-border p-4">
            {programmeName.trim() && (
              <InfoZeile icon={GraduationCap} label="Programm" wert={programmeName} />
            )}
            {cohortName.trim() && <InfoZeile icon={Users} label="Kohorte" wert={cohortName} />}
          </div>
        )}
        <div className="border-t border-border p-1">
          <DropdownMenuItem
            onClick={() => signOut()}
            className="min-h-11 gap-2 rounded-lg px-3 text-sm text-eco-deep-green focus:bg-eco-green/10 focus:text-eco-deep-green"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
            Abmelden
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
