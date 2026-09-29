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
        {/* Handoff 2a: Links als Touch-Ziele (min-h-11), Hover hellgrün. */}
        <nav aria-label="Rechtliches" className="flex flex-wrap justify-center gap-1">
          {[
            { href: "/impressum", label: "Impressum" },
            { href: "/datenschutz", label: "Datenschutz" },
            { href: "/barrierefreiheit", label: "Barrierefreiheit" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-[13px] text-muted-foreground outline-none hover:bg-eco-green/10 hover:text-eco-deep-green focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-center text-[13px] text-muted-foreground md:justify-self-end md:text-right">
          © {new Date().getFullYear()} The Academy for Climate Jobs
        </p>
      </div>
    </footer>
  );
}
