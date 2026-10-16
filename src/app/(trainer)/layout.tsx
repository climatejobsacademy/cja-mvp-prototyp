import { LogOut } from "lucide-react";

import { signOut } from "@/app/(learner)/actions";
import { KohortenChat } from "@/components/chat/kohorten-chat";
import { Wortmarke } from "@/components/nav/app-nav";
import { chatKohortenFuerTrainer } from "@/lib/queries/kohorten-chat";
import { requireCurrentTrainer } from "@/lib/queries/trainer-bereich";

// Bereich für Trainer:innen (SR-81, Paket G2): eigener schmaler Kopf ohne
// Lernenden-Navigation; mobil zuerst (Werkstatt, Handy). Rollen-Gate in
// requireCurrentTrainer (src/lib/trainer-tag.ts).
export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const trainer = await requireCurrentTrainer();
  // Kohorten-Chat (SR-83, PR 3): nur Kohorten mit freigeschaltetem Chat, die die Person moderiert.
  const chatKohorten = await chatKohortenFuerTrainer();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-3 px-4 md:px-6">
          <Wortmarke href="/trainer" />
          <span className="flex-1" />
          <span className="truncate text-sm text-ink-muted">{trainer.rufname}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Abmelden
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-10 md:px-6 md:py-10">{children}</div>
      {chatKohorten.length > 0 && <KohortenChat vorname={trainer.rufname} modus="trainer" kohorten={chatKohorten} />}
    </div>
  );
}
