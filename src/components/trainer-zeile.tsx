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
  klein = false,
  className,
}: {
  art: "live" | "praxis";
  trainer: TrainerAnzeige;
  klein?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", klein ? "text-[11px]" : "text-[13px]", className)}>
      <PersonAvatar
        name={trainer.rufname}
        fotoUrl={trainer.fotoUrl}
        className={klein ? "size-4" : "size-6"}
        fallbackClassName={klein ? "text-[9px]" : "text-[11px]"}
      />
      <span className="truncate">
        {art === "live" ? "Live" : "Praxis"} mit {trainer.rufname}
      </span>
    </span>
  );
}
