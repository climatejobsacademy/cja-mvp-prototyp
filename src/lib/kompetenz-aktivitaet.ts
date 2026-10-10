// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, Brief 2.4, SR
// folgt): Meta-Zeile je Lernaktivität in "Hier lernst du das", z. B.
// "Live-Unterricht · heute, 13:00", "Selbstlernen · offen", "Praxis · Montag".
// Reine Funktion, `heute` kommt aus heuteInBerlin() (src/lib/date.ts).

export type AktivitaetFuerMeta = {
  art: "live" | "selbst" | "praxis";
  /** "JJJJ-MM-TT" oder null, wenn nicht im eigenen Plan */
  datum: string | null;
  /** "HH:MM:SS" bei Live-Terminen */
  start: string | null;
  erledigt: boolean;
};

const ART: Record<AktivitaetFuerMeta["art"], string> = {
  live: "Live-Unterricht",
  selbst: "Selbstlernen",
  praxis: "Praxis",
};

const alsDatum = (d: string) => new Date(`${d}T00:00:00Z`);

/** "heute", "morgen", "Montag" (bis 6 Tage), sonst "Mo, 12.10." */
function wann(datum: string, heute: string): string {
  const tage = Math.round((alsDatum(datum).getTime() - alsDatum(heute).getTime()) / 86_400_000);
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  const d = alsDatum(datum);
  if (tage > 1 && tage < 7) return d.toLocaleDateString("de-DE", { weekday: "long", timeZone: "UTC" });
  const tag = d.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  return `${tag}, ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}`;
}

export function aktivitaetMeta(a: AktivitaetFuerMeta, heute: string): string {
  const art = ART[a.art];
  if (a.erledigt) return `${art} · ${a.art === "praxis" ? "durchgeführt" : "erledigt"}`;
  if (!a.datum) return a.art === "selbst" ? `${art} · offen` : art;
  if (a.datum < heute) return a.art === "selbst" ? `${art} · offen` : `${art} · vorbei`;
  const zeit = a.start ? `, ${a.start.slice(0, 5)}` : "";
  if (a.art === "selbst" && a.datum === heute) return `${art} · heute, flexibel`;
  return `${art} · ${wann(a.datum, heute)}${zeit}`;
}
