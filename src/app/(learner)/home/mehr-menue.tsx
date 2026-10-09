"use client";

import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { FileText, MessageCircle, MoreHorizontal } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Home v6 (docs/design_handoff_home_v6, Brief 2.3 + 8.4, SR folgt): "⋯" neben
// dem Hauptbutton der Fokus-Karte. Führt in die bestehende Lektionsseite,
// direkt zu Materialien bzw. Fragen-Thread (deren Überschriften-ids).

const EINTRAG =
  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-eco-deep-green outline-none data-highlighted:bg-eco-green/10";

export function MehrMenue({ lessonId }: { lessonId: string }) {
  const basis = `/content/${lessonId}?von=home`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mehr: Unterlagen und Chat"
        className="inline-flex size-[52px] items-center justify-center rounded-xl border border-white/20 text-white outline-none transition-[background-color] duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-charge-green focus-visible:ring-offset-2 focus-visible:ring-offset-eco-deep-green data-popup-open:bg-white/10 motion-reduce:transition-none"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-56 rounded-xl p-1.5 shadow-lg">
        <MenuPrimitive.LinkItem
          closeOnClick
          className={EINTRAG}
          render={<Link href={`${basis}#materialien-ueberschrift`} />}
        >
          <FileText className="size-[18px] shrink-0 text-eco-green" aria-hidden="true" />
          Unterlagen
        </MenuPrimitive.LinkItem>
        <MenuPrimitive.LinkItem
          closeOnClick
          className={EINTRAG}
          render={<Link href={`${basis}#thread-ueberschrift`} />}
        >
          <MessageCircle className="size-[18px] shrink-0 text-eco-green" aria-hidden="true" />
          Chat
        </MenuPrimitive.LinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
