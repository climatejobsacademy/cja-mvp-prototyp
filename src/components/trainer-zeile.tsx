import { PersonAvatar } from "@/components/person-avatar";
import type { TrainerAnzeige } from "@/lib/queries/trainer";
import { cn } from "@/lib/utils";

/**
 * "Live mit Malte" / "Praxis mit Slawa" mit Foto (SR-78). Ersetzt die fest
 * eingetragenen Namen von demo (demo-personen.ts): die Person kommt aus
 * live_session.trainer_id bzw. field_job.instructor_id, Name und Foto aus
 * fn_meine_trainer(). Ohne eingetragene Person wird nichts angezeigt.
 */
export function TrainerZeile({
  art,
  trainer,
  zweite = null,
  klein = false,
  className,
}: {
  art: "live" | "praxis";
  trainer: TrainerAnzeige;
  /** Zweite begleitende Trainer:in am Praxis- oder Labortag (SR-78, 0071), nur Anzeige */
  zweite?: TrainerAnzeige | null;
  klein?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", klein ? "text-[11px]" : "text-[13px]", className)}>
      <span className="flex shrink-0">
        {[trainer, ...(zweite ? [zweite] : [])].map((t, i) => (
          <PersonAvatar
            key={t.personId}
            name={t.rufname}
            fotoUrl={t.fotoUrl}
            className={cn(klein ? "size-4" : "size-6", i > 0 && (klein ? "-ml-1" : "-ml-1.5"))}
            fallbackClassName={klein ? "text-[9px]" : "text-[11px]"}
          />
        ))}
      </span>
      <span className="truncate">
        {art === "live" ? "Live" : "Praxis"} mit {trainer.rufname}
        {zweite ? ` und ${zweite.rufname}` : ""}
      </span>
    </span>
  );
}
