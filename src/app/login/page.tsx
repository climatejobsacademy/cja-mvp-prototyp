import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="font-heading text-2xl text-eco-deep-green">AfCJ</h1>
        <p className="text-muted-foreground text-sm">
          Qualifizierungsplattform Elektrofachkraft Erneuerbare Energien
        </p>
      </div>
      {error === "kein-profil" && (
        <p className="rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground">
          Du bist eingeloggt, aber es gibt noch kein Profil für dich. Bitte an
          die Ansprechperson bei AfCJ wenden.
        </p>
      )}
      {error === "keine-einschreibung" && (
        <p className="rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground">
          Du hast noch keine aktive Einschreibung in ein Programm.
        </p>
      )}
      {error === "login-fehlgeschlagen" && (
        <p className="rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground">
          Der Login-Link war ungültig oder ist abgelaufen. Bitte neu anfordern.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
