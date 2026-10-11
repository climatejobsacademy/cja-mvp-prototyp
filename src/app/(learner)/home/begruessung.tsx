import { FlaskConical, Video, Wrench } from "lucide-react";

import { datumKurz, datumLang } from "@/lib/date";
import { cn } from "@/lib/utils";

import { type Tagestyp } from "./home-hilfen";

// Home v12 (docs/design_handoff_home_v6, Brief 2.2, SR folgt): "Hallo
// {Vorname}", Datum und Tagestyp-Label, darüber ggf. der Hinweis auf die
// simulierte Testzeit (?now).

function TagestypLabel({ typ, online }: { typ: Exclude<Tagestyp, null>; online: boolean }) {
  // Nie nur über Farbe (WCAG 1.4.1): immer Icon + Text. Lylac/Coral nur als
  // helle Fläche bzw. Icon, Text in Eco Deep Green (Kontrast).
  const { Icon, text, flaeche, iconFarbe } =
    typ === "praxis"
      ? { Icon: Wrench, text: "Praxistag", flaeche: "bg-praxis-tint", iconFarbe: "text-praxis-text" }
      : { Icon: Video, text: online ? "Theorietag · online" : "Theorietag", flaeche: "bg-brand-tint", iconFarbe: "text-brand" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-[11px] py-1 text-xs font-semibold text-ink",
        flaeche
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", iconFarbe)} strokeWidth={2.2} aria-hidden="true" />
      {text}
    </span>
  );
}

export function TestzeitHinweis({ heute, jetzt }: { heute: string; jetzt: string }) {
  return (
    <p className="-mb-4 inline-flex items-center gap-2 self-start rounded-full bg-brand-tint px-3 py-1 text-[13px] text-ink md:-mb-6">
      <FlaskConical className="size-4 shrink-0 text-brand" aria-hidden="true" />
      Testansicht: simulierte Zeit {datumKurz(heute)}, {jetzt.slice(11, 16)} Uhr
    </p>
  );
}

export function Begruessung({
  vorname,
  heute,
  typ,
  online,
}: {
  vorname: string;
  heute: string;
  typ: Tagestyp;
  online: boolean;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h1 className="font-heading text-[40px] leading-none text-ink md:text-[52px]">
        {vorname ? `Hallo ${vorname}` : "Hallo"}
      </h1>
      <div className="flex flex-wrap items-center gap-2.5 text-sm text-ink-subtle">
        <span>{datumLang(heute)}</span>
        {typ && <TagestypLabel typ={typ} online={online} />}
      </div>
    </section>
  );
}
