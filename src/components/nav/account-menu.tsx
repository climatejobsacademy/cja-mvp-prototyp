"use client";

import { useRef, useSyncExternalStore } from "react";
import { Camera, GraduationCap, LogOut, Trash2, Users } from "lucide-react";

import { signOut } from "@/app/(learner)/actions";
import { Avatar } from "@/components/avatar";
import { fotoAbonnieren, fotoEntfernen, fotoLesen, fotoSpeichern } from "@/lib/eigenes-foto";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function InfoZeile({ icon: Icon, label, wert }: { icon: typeof GraduationCap; label: string; wert: string }) {
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
  const eingabe = useRef<HTMLInputElement>(null);
  const foto = useSyncExternalStore(fotoAbonnieren, fotoLesen, () => null);

  return (
    <>
      {/* Außerhalb des Menüs, damit es beim Schließen nicht verschwindet. */}
      <input
        ref={eingabe}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const datei = e.target.files?.[0];
          e.target.value = "";
          if (datei) void fotoSpeichern(datei);
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account-Menü"
          className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-semibold text-white outline-none transition-[background-color,box-shadow] duration-150 hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 data-popup-open:ring-2 data-popup-open:ring-brand data-popup-open:ring-offset-2 motion-reduce:transition-none"
        >
          {/* Eigenes Foto, falls im Browser hinterlegt (Demo, Anna 2026-10-12), sonst Initiale. */}
          <Avatar name={name || email} eigenes groesse="md" flaeche="bg-brand text-white" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-[300px] max-w-[calc(100vw-2rem)] rounded-xl p-0 shadow-lg"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-3 p-4 font-normal">
              <Avatar name={name || email} eigenes groesse="md" className="size-10" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold text-ink">{name}</span>
                <span className="truncate text-[13px] text-muted-foreground">{email}</span>
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          {/* Nur anzeigen, was die Daten hergeben -- leere Werte werden weggelassen. */}
          {(programmeName.trim() || cohortName.trim()) && (
            <div className="flex flex-col gap-3 border-t border-border p-4">
              {programmeName.trim() && <InfoZeile icon={GraduationCap} label="Programm" wert={programmeName} />}
              {cohortName.trim() && <InfoZeile icon={Users} label="Kohorte" wert={cohortName} />}
            </div>
          )}
          <div className="border-t border-border p-1">
            {/* Profilfoto (Anna 2026-10-12) -- VORLÄUFIG, nur Demo: bleibt in diesem Browser. */}
            <DropdownMenuItem
              onClick={() => eingabe.current?.click()}
              className="min-h-11 gap-2 rounded-lg px-3 text-sm text-ink focus:bg-subtle focus:text-ink"
            >
              <Camera className="size-[18px]" aria-hidden="true" />
              {foto ? "Profilfoto ändern" : "Profilfoto hinzufügen"}
            </DropdownMenuItem>
            {foto && (
              <DropdownMenuItem
                onClick={fotoEntfernen}
                className="min-h-11 gap-2 rounded-lg px-3 text-sm text-ink focus:bg-subtle focus:text-ink"
              >
                <Trash2 className="size-[18px]" aria-hidden="true" />
                Profilfoto entfernen
              </DropdownMenuItem>
            )}
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
    </>
  );
}
