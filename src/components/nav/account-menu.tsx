"use client";

import { LogOut } from "lucide-react";

import { signOut } from "@/app/(learner)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialFor(name: string, email: string) {
  const trimmedName = name.trim();
  if (trimmedName) {
    return trimmedName[0]!.toUpperCase();
  }
  return (email.trim()[0] ?? "?").toUpperCase();
}

/**
 * Account-/Profil-Menü (docs/design-specifications.md, Abschnitt "Account-
 * /Profil-Menü"): Trigger ist der Initialen-Kreis oben rechts in der
 * Top-Nav, ersetzt den vorherigen eigenständigen "Abmelden"-Punkt.
 */
export function AccountMenu({ name, email }: { name: string; email: string }) {
  const initial = initialFor(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account-Menü"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:size-9"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 text-xs font-normal">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Platzhalter für spätere Einträge (Profil, Einstellungen/Sprache) --
            bewusst nicht Teil des Prototyps, siehe docs/design-specifications.md. */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut aria-hidden="true" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
