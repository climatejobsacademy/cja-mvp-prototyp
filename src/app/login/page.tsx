import Image from "next/image";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import { LoginForm } from "./login-form";

/**
 * Bildvariante links (Handoff 2a, Login): Illustration oder eines der beiden
 * Praxis-Fotos. Die Auswahl trifft die Geschäftsführung -- hier umstellen.
 */
const LOGIN_BILD: "illustration" | "werkstatt" | "detail" = "illustration";

const BILDER = {
  illustration: {
    src: "/branding/login-hero.png",
    alt: "Illustration einer Elektrofachkraft mit Helm, Sicherheitsweste und Werkzeuggürtel",
    foto: false,
    // Ausschnitt mobil / Desktop
    position: "object-bottom",
  },
  werkstatt: {
    src: "/branding/login-foto-werkstatt.jpg",
    alt: "Teilnehmerin prüft eine gelötete Platine in der Praxisübung",
    foto: true,
    position: "object-[62%_30%] md:object-[64%_center]",
  },
  detail: {
    src: "/branding/login-foto-detail.jpg",
    alt: "Hände verdrahten einen Schalter in der Praxisübung",
    foto: true,
    position: "object-[38%_45%] md:object-[40%_center]",
  },
} as const;

const HINWEISE: Record<string, string> = {
  "kein-profil":
    "Du bist eingeloggt, aber es gibt noch kein Profil für dich. Bitte wende dich an deine Ansprechperson bei AfCJ.",
  "keine-einschreibung": "Du hast noch keine aktive Einschreibung in ein Programm.",
  "login-fehlgeschlagen": "Der Login-Link war ungültig oder ist abgelaufen. Bitte fordere einen neuen an.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const hinweis = error ? HINWEISE[error] : undefined;
  const bild = BILDER[LOGIN_BILD];

  return (
    <div className="grid flex-1 bg-white md:grid-cols-[46%_1fr]">
      {/*
        Bildfläche: mobil oben (Illustration h-[260px], Foto h-[236px] mit
        Rand und Rundung), ab md als linke Spalte auf Off-White.
      */}
      <div className={cn("bg-off-white md:relative", bild.foto ? "px-4 pt-4 md:p-0" : "")}>
        <div
          className={cn(
            "relative w-full md:absolute md:inset-0",
            bild.foto ? "h-[236px] overflow-hidden rounded-2xl md:m-6 md:h-auto md:rounded-xl" : "h-[260px] md:h-auto"
          )}
        >
          <Image
            src={bild.src}
            alt={bild.alt}
            fill
            priority
            sizes="(min-width: 768px) 46vw, 100vw"
            className={cn(bild.foto ? "object-cover" : "object-contain", bild.position)}
          />
        </div>
      </div>

      <main className="flex items-center justify-center px-4 py-8 md:px-8 md:py-16">
        <div className="flex w-full max-w-[380px] flex-col gap-8">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h1 className="font-heading text-[32px] leading-tight text-eco-deep-green md:text-[40px]">
              The Academy for Climate Jobs
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Qualifizierungsplattform · Fachkräfte für die Energiewende
            </p>
          </div>

          {hinweis && (
            <p
              className="flex items-start gap-2 rounded-lg border-2 border-coral p-3 text-sm text-eco-deep-green"
              role="alert"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
              {hinweis}
            </p>
          )}

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
