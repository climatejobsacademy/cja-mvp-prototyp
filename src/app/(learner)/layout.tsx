import type { Kanal } from "@/components/chat/chat-demo-daten";
import { DemoChat } from "@/components/chat/demo-chat";
import { AppNav } from "@/components/nav/app-nav";
import { heuteInBerlin } from "@/lib/date";
import { gliederungFuer, modulStatus } from "@/lib/programm";
import { getKohortenZeitraum } from "@/lib/queries/programm";
import { requireCurrentLearner } from "@/lib/queries/session";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stellt sicher, dass jede Route unter (learner) eine Person mit aktiver
  // Einschreibung voraussetzt, bevor irgendeine Seite rendert.
  const learner = await requireCurrentLearner();

  // Haupt-Chat (VORLÄUFIG, nur Demo, Anna 2026-10-11): Kanäle Ankündigungen,
  // je Modul der Gliederung (wie Programmseite) und Treffpunkt.
  const kohorte = await getKohortenZeitraum(learner.cohortId);
  const gliederung = gliederungFuer(learner.programmeName, kohorte?.start ?? null);
  const status = gliederung ? modulStatus(gliederung, heuteInBerlin()) : [];
  const kanaele: Kanal[] = [
    { id: "ankuendigungen", art: "ankuendigungen", titel: "Ankündigungen", zusatz: "Nur das Team schreibt hier", schreibbar: false, modulStatus: null },
    ...(gliederung ?? [])
      .map((m, i) => ({ m, status: status[i] }))
      .filter(({ m }) => m.ueberzeile.startsWith("Modul"))
      .map(({ m, status: st }): Kanal => ({
        id: `modul-${m.nummer}`,
        art: "modul",
        titel: `Modul ${m.nummer}: ${m.name}`,
        zusatz: `Fragen und Austausch zu Modul ${m.nummer}`,
        schreibbar: true,
        modulStatus: st,
      })),
    { id: "treffpunkt", art: "treffpunkt", titel: "Treffpunkt", zusatz: "Locker unter Lernenden deiner Kohorte", schreibbar: true, modulStatus: null },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav
        name={learner.name}
        email={learner.email}
        programmeName={learner.programmeName}
        cohortName={learner.cohortName}
      />
      {/* Handoff 2a: Inhalt max-w-3xl, mobil px-4 pt-5 pb-8, Desktop py-10 pb-16.
          Seiten mit data-breit (Home, Kompetenzen, Stundenplan) bekommen einheitlich
          1120 px und 40 px Seitenrand wie Home-Vorlage v6 -- Entscheidung Anna
          2026-10-13 nach Vergleich 1080/1120/1200/1280. */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-8 has-[[data-breit]]:max-w-[1120px] md:py-10 md:pb-16 md:has-[[data-breit]]:px-10">
        {children}
      </div>
      <DemoChat kanaele={kanaele} vorname={learner.name.trim().split(" ")[0]} />
    </div>
  );
}
