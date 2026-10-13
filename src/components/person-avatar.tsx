"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initiale } from "@/lib/profilfoto";
import { cn } from "@/lib/utils";

/**
 * Rundes Profilfoto (SR-77, SR-78) aus einem signierten Link; ohne Foto
 * oder wenn das Bild nicht lädt, die Initiale. Dekorativ -- der Name steht
 * immer daneben im Text.
 */
export function PersonAvatar({
  name,
  fotoUrl,
  className,
  fallbackClassName,
}: {
  name: string;
  fotoUrl: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={className} aria-hidden="true">
      {fotoUrl && <AvatarImage src={fotoUrl} alt="" />}
      <AvatarFallback className={cn("font-semibold", fallbackClassName)}>{initiale(name)}</AvatarFallback>
    </Avatar>
  );
}
