import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      {/*
        Mobile: kompakter Banner-Streifen oben statt komplett ausgeblendet
        (feste Höhe, object-cover + object-top -- Kopf/Helm bleibt sichtbar,
        Rest wird beschnitten). Ab md ersetzt durch das große Seitenpanel
        unten; beide teilen sich dieselbe Datei, nur Zuschnitt/Größe
        unterscheiden sich. Harte Nebenbedingung: E-Mail-Feld + Button
        müssen auf einem 375×667-Viewport ohne Scrollen sichtbar bleiben --
        deshalb hier absichtlich kompaktere Abstände (py-8/gap-4) als bei md.
      */}
      <div className="relative h-32 w-full shrink-0 bg-off-white md:hidden">
        <Image
          src="/branding/login-hero.png"
          alt="Illustration einer Elektrofachkraft mit Helm, Sicherheitsweste und Werkzeuggürtel"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
        />
      </div>
      {/*
        Ab md: großes Seitenpanel statt Banner. Off-White als Hintergrund
        der Fläche (docs/design-specifications.md Abschnitt 1, um
        --off-white ergänzt), sichtbar bevor/falls login-hero.png fehlt.
      */}
      <div className="relative hidden w-1/2 bg-off-white md:block">
        <Image
          src="/branding/login-hero.png"
          alt="Illustration einer Elektrofachkraft mit Helm, Sicherheitsweste und Werkzeuggürtel"
          fill
          priority
          sizes="50vw"
          className="object-contain"
        />
      </div>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-8 md:w-1/2 md:gap-6 md:py-16">
        <div className="text-center">
          <h1 className="font-heading text-2xl text-eco-deep-green">
            The Academy for Climate Jobs
          </h1>
          <p className="mt-2 text-base font-medium text-eco-deep-green">
            Fachkräfte für die Energiewende
          </p>
          <p className="text-sm text-muted-foreground">Qualifizierungsplattform</p>
        </div>
        {error === "kein-profil" && (
          <p className="rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground">
            Du bist eingeloggt, aber es gibt noch kein Profil für dich. Bitte an
            die Ansprechperson bei AfCJ wenden.
          </p>
        )}
        {error === "keine-einschreibung" && (
          <p className="rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground">
            Du hast noch keine aktive Einschreibung in ein Programm.
          </p>
        )}
        {error === "login-fehlgeschlagen" && (
          <p className="rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground">
            Der Login-Link war ungültig oder ist abgelaufen. Bitte neu anfordern.
          </p>
        )}
        <LoginForm />
        {/*
          SR-60: einziger aktuell öffentlicher, ohne Login erreichbarer
          Einstiegspunkt -- die drei rechtlichen Standardseiten sind sonst
          nirgends im Produkt verlinkt (kein App-weiter Footer vorhanden).
        */}
        <footer className="flex justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/impressum" className="hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:underline">
            Datenschutz
          </Link>
          <Link href="/barrierefreiheit" className="hover:underline">
            Barrierefreiheit
          </Link>
        </footer>
      </main>
    </div>
  );
}
