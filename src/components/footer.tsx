import Image from "next/image";
import Link from "next/link";

/**
 * App-weiter Footer mit den rechtlichen Pflichtseiten (SR-60) -- wird im
 * Root-Layout nach {children} gerendert und erscheint damit auf allen Seiten
 * (Login, rechtliche Seiten, Learner-Bereich). Aufteilung Logo links / Links
 * mittig / Copyright rechts angelehnt an climatejobsacademy.com, optisch
 * bewusst zurückhaltender (dünne graue Linie, weißer Hintergrund).
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-6 md:grid md:grid-cols-[1fr_auto_1fr]">
        <Image
          src="/branding/The Academy For Climate Jobs Logo RGB Dark Green.png"
          alt="The Academy for Climate Jobs"
          width={49}
          height={40}
          className="h-10 w-auto md:justify-self-start"
        />
        <nav aria-label="Rechtliches" className="flex gap-3 text-xs text-muted-foreground">
          <Link href="/impressum" className="hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:underline">
            Datenschutz
          </Link>
          <Link href="/barrierefreiheit" className="hover:underline">
            Barrierefreiheit
          </Link>
        </nav>
        <p className="text-center text-xs text-muted-foreground md:justify-self-end md:text-right">
          © {new Date().getFullYear()} The Academy for Climate Jobs. Alle Rechte vorbehalten.
        </p>
      </div>
    </footer>
  );
}
