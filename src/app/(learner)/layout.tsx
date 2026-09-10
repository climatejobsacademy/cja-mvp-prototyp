import { AppNav } from "@/components/nav/app-nav";
import { requireCurrentLearner } from "@/lib/queries/session";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stellt sicher, dass jede Route unter (learner) eine Person mit aktiver
  // Einschreibung voraussetzt, bevor irgendeine Seite rendert.
  await requireCurrentLearner();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
