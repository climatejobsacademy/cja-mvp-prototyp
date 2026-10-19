"use client";

import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { FileText, MessageCircle, MoreHorizontal } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Home (docs/design_handoff_home_v6, Brief 2.3 + 8.4; SR-73): "⋯" neben
// dem Hauptbutton der Fokus-Karte. Führt in die bestehende Lektionsseite,
// direkt zu Materialien bzw. Fragen-Thread (deren Überschriften-ids).

const EINTRAG =
  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-ink outline-none data-highlighted:bg-subtle";

export function MehrMenue({ lessonId, aufCoral }: { lessonId: string; aufCoral?: boolean }) {
  const basis = `/content/${lessonId}?von=home`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mehr: Unterlagen und Chat"
        className={cn(
          "inline-flex size-[52px] items-center justify-center rounded-full border outline-none transition-[background-color] duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none",
          aufCoral
            ? "border-ink/30 text-ink hover:bg-white/30 focus-visible:ring-ink data-popup-open:bg-white/30"
            : "border-white/30 text-white hover:bg-white/15 focus-visible:ring-white focus-visible:ring-offset-brand data-popup-open:bg-white/15"
        )}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-56 rounded-xl p-1.5 shadow-lg">
        <MenuPrimitive.LinkItem
          closeOnClick
          className={EINTRAG}
          render={<Link href={`${basis}#materialien-ueberschrift`} />}
        >
          <FileText className="size-[18px] shrink-0 text-brand" aria-hidden="true" />
          Unterlagen
        </MenuPrimitive.LinkItem>
        <MenuPrimitive.LinkItem
          closeOnClick
          className={EINTRAG}
          render={<Link href={`${basis}#thread-ueberschrift`} />}
        >
          <MessageCircle className="size-[18px] shrink-0 text-brand" aria-hidden="true" />
          Chat
        </MenuPrimitive.LinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
