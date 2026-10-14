import Link from "next/link";
import { ChevronRight, Wrench } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { datumKurz } from "@/lib/date";
import { STAND_TEXT } from "@/lib/praxisbericht";
import { getPraxisberichte } from "@/lib/queries/trainer-berichte";
import { requireCurrentTrainer } from "@/lib/queries/trainer-bereich";
import { cn } from "@/lib/utils";

import { STAND_FARBE } from "./stand-farbe";

// Praxisberichte der eigenen Kohorten (SR-82, Paket G3): offene zuerst.

export default async function Praxisberichte() {
  await requireCurrentTrainer();
  const berichte = await getPraxisberichte();
  const offen = berichte.filter((b) => b.stand === "offen").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Praxisberichte" />
      <p className="text-sm text-ink-muted">
        {berichte.length === 0
          ? "In deinen Kohorten wurde noch kein Praxisbericht eingereicht."
          : `${offen} offen, ${berichte.length - offen} geprüft.`}
      </p>
      {berichte.length > 0 && (
        <ul className="flex flex-col gap-2">
          {berichte.map((b) => (
            <li key={b.id}>
              <Link
                href={`/trainer/berichte/${b.id}`}
                className="flex min-h-14 items-center gap-3 rounded-zeile border-l-[3px] border-l-praxis bg-praxis-tint px-4 py-3 outline-none hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Wrench className="size-4 shrink-0 text-praxis-text" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{b.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {b.titel}
                    {b.datum && ` · ${datumKurz(b.datum)}`}
                  </span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", STAND_FARBE[b.stand])}>
                  {STAND_TEXT[b.stand]}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
