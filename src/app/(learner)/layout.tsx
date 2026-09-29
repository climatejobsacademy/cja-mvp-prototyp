import { AppNav } from "@/components/nav/app-nav";
import { requireCurrentLearner } from "@/lib/queries/session";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stellt sicher, dass jede Route unter (learner) eine Person mit aktiver
  // Einschreibung voraussetzt, bevor irgendeine Seite rendert.
  const learner = await requireCurrentLearner();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav
        name={learner.name}
        email={learner.email}
        programmeName={learner.programmeName}
        cohortName={learner.cohortName}
      />
      {/* Handoff 2a: Inhalt max-w-3xl, mobil px-4 pt-5 pb-8, Desktop py-10 pb-16. */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-8 md:py-10 md:pb-16">{children}</div>
    </div>
  );
}
