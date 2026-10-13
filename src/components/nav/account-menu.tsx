"use client";

import { useState } from "react";
import { GraduationCap, LogOut, UserRound, Users } from "lucide-react";

import { signOut } from "@/app/(learner)/actions";
import { PersonAvatar } from "@/components/person-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ProfilDialog } from "./profil-dialog";

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
      <Icon className="mt-0.5 size-[18px] shrink-0 text-ink" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm leading-snug font-medium text-ink">{wert}</span>
      </div>
    </div>
  );
}

/**
 * Account-/Profil-Menü (Handoff 2a, "Avatar-Menü"): Kopf mit Foto, Name +
 * E-Mail, Info-Zeilen Programm/Kohorte (nicht klickbar, kein Hover),
 * Menüpunkte "Profil bearbeiten" (Foto und Rufname, SR-77) und "Abmelden".
 */
export function AccountMenu({
  name,
  rufname,
  fotoUrl,
  email,
  programmeName,
  cohortName,
}: {
  name: string;
  rufname: string;
  fotoUrl: string | null;
  email: string;
  programmeName: string;
  cohortName: string;
}) {
  const [profilOffen, setProfilOffen] = useState(false);
  const anzeigeName = name.trim() || email;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account-Menü"
          // Header wie demo (3B): Avatar in Lila, Initiale weiß; mit Foto das Foto.
          className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-semibold text-white outline-none transition-[background-color,box-shadow] duration-150 hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 data-popup-open:ring-2 data-popup-open:ring-brand data-popup-open:ring-offset-2 motion-reduce:transition-none"
        >
          <PersonAvatar
            name={anzeigeName}
            fotoUrl={fotoUrl}
            className="size-full after:hidden"
            fallbackClassName="bg-transparent text-sm text-white"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-[300px] max-w-[calc(100vw-2rem)] rounded-xl p-0 shadow-lg"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-3 p-4 font-normal">
              <PersonAvatar
                name={anzeigeName}
                fotoUrl={fotoUrl}
                className="size-10"
                fallbackClassName="bg-brand text-[15px] text-white"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold text-ink">{name}</span>
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
              onClick={() => setProfilOffen(true)}
              className="min-h-11 gap-2 rounded-lg px-3 text-sm text-ink focus:bg-subtle focus:text-ink"
            >
              <UserRound className="size-[18px]" aria-hidden="true" />
              Profil bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut()}
              className="min-h-11 gap-2 rounded-lg px-3 text-sm text-ink focus:bg-subtle focus:text-ink"
            >
              <LogOut className="size-[18px]" aria-hidden="true" />
              Abmelden
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Außerhalb des Menüs, damit der Dialog beim Schließen des Menüs offen bleibt. */}
      <ProfilDialog offen={profilOffen} onOffenChange={setProfilOffen} name={name} rufname={rufname} fotoUrl={fotoUrl} />
    </>
  );
}
