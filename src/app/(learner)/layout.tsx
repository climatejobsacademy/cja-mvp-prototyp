import { KohortenChat } from "@/components/chat/kohorten-chat";
import { AppNav } from "@/components/nav/app-nav";
import { chatSichtbar } from "@/lib/queries/kohorten-chat";
import { requireCurrentLearner } from "@/lib/queries/session";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stellt sicher, dass jede Route unter (learner) eine Person mit aktiver
  // Einschreibung voraussetzt, bevor irgendeine Seite rendert.
  const learner = await requireCurrentLearner();
  // Kohorten-Chat (SR-83): nur, wenn er für die Kohorte freigeschaltet ist
  // (cohort.chat_aktiv) und die Person ihn lesen darf -- gleiche Regel wie die Policy.
  const chat = await chatSichtbar(learner.cohortId);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav
        name={learner.name}
        rufname={learner.rufname}
        fotoUrl={learner.fotoUrl}
        email={learner.email}
        programmeName={learner.programmeName}
        cohortName={learner.cohortName}
        organisationLogo={learner.organisationLogo}
      />
      {/* Handoff 2a: Inhalt max-w-3xl, mobil px-4 pt-5 pb-8, Desktop py-10 pb-16.
          Seiten mit data-breit (Home, Kompetenzen, Stundenplan, Programm) bekommen
          1120 px und 40 px Seitenrand wie der Kopf -- Entscheidung Anna 2026-10-13
          nach Vergleich 1080/1120/1200/1280. */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-8 has-[[data-breit]]:max-w-[1120px] md:py-10 md:pb-16 md:has-[[data-breit]]:px-10">
        {children}
      </div>
      {chat && <KohortenChat vorname={learner.rufname} />}
    </div>
  );
}
