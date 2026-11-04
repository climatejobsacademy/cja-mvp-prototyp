# Umgebungen

Welche Umgebung wofür da ist, gegen welche Datenbank sie läuft und welche Daten darin liegen. Wie man nach Production kommt, steht in `release.md`, was zu tun ist, wenn etwas bricht, in `runbook.md`. Werte von Variablen und Schlüsseln stehen hier nicht; die Projekt-Refs stehen in `CLAUDE.md`.

## Überblick

| Umgebung | Branch | Datenbank | Adresse | Daten | Wofür |
|---|---|---|---|---|---|
| Production | `main` | Supabase Frankfurt | Production-Domain (Vercel Production) | echte Lernende und Trainer:innen, dazu Testkonten des Teams | Betrieb mit der laufenden Kohorte |
| Staging | `dev` und Feature-Branches | Supabase Irland | Vercel-Previews je Branch und Pull Request | keine echten Lernenden; Testkonten und eine Demo-Kohorte | Testen jeder Änderung vor dem Release, Migrationen zuerst hier |
| demo | `demo` | keine eigene, nutzt Supabase Irland wie Staging | Vercel-Preview des Branches `demo` | wie Staging | Vorlage für den Realbau des Praxisflows |
| lokal | beliebig | Werte in `.env.local`: Staging oder ein lokales `supabase start` | `http://localhost:3000` | wie die gewählte Datenbank | Entwickeln und Ausprobieren |

Belegt sind Branch und Datenbank von Production (`CLAUDE.md`, `release.md`) und die Werte für lokal (`.env.example`). Die Angaben zu den Daten stammen aus der Projektdoku und sind im Repository nicht prüfbar.

Staging und `demo` laufen gegen dasselbe Supabase-Projekt in Irland, Production gegen das Projekt in Frankfurt. Das ist eine Angabe der Produkt-Lead; die Einstellung steht in Vercel (Settings, Environment Variables, Variable `NEXT_PUBLIC_SUPABASE_URL` je Umgebung) und nicht im Repository. Ebenfalls nur in Vercel stehen die Funktionsschalter (`FACHSPRACHE_EINHEIT`, `PRAXISAUFGABE_LINK`, `NATIVE_SELBSTLERNEN`): Sie haben je Vercel-Umgebung einen eigenen Wert, der nur in Vercel steht (`runbook.md`, Abschnitt 7).

## Production

Die einzige Umgebung mit echten Personendaten. Schreiben nur über die Skripte und Abläufe aus `release.md`, aus dem Release-Ordner, mit Probelauf und getippter Freigabe. Handgeschriebenes SQL gegen Production nur lesend, mit geprüftem `transaction_read_only = on` (`runbook.md`, Anhang). Ein Merge auf `main` veröffentlicht automatisch.

Smoke-Tests und Klicktests auf Production laufen nur mit Testkonten des Teams, nie mit Konten von Lernenden (`release.md`, Abschnitt 5).

## Staging

Gegen Staging wird alles erprobt, bevor es nach Production geht: Migrationen, Importe, Skripte und neue Ansichten. Auch hier gilt der Probelauf vor dem echten Lauf. Staging enthält keine echten Lernenden, Testdaten dürfen hier entstehen und gelöscht werden, soweit sie niemand anderes gerade nutzt.

## demo

`demo` ist ein früher Abzweig von `dev` mit eigenen Commits. Er enthält Ansichten, die es auf `dev` nicht gibt, darunter den Praxisflow als Prototyp ohne Server (Stand im Browser, `praxisflow-realbau.md`) und eine Hilfe-Seite. Er kennt viele spätere Migrationen nicht und hat keine eigene Datenbank; seine Preview läuft gegen das Staging-Projekt in Irland (siehe oben). Alles, was in `demo` angelegt wird, landet also in der Staging-Datenbank. Vermutung: Nicht jede Ansicht in `demo` passt zum Schema von Staging.

Was daraus gebraucht wird, wird gezielt nach `dev` übernommen (Komponenten, Logik, Tests; `praxisflow-realbau.md`), nicht per Merge des Branches. Migrationen entstehen nie auf `demo`, sondern nur über Feature-Branches nach `dev` (`CLAUDE.md`, Regel 4).

## Lokal

Eine lokale Kopie arbeitet gegen Staging oder gegen eine lokale Supabase-Instanz (`supabase start`); die Werte stehen in `.env.local`, die nie committet wird. Eine lokale Kopie wird nie mit Production verlinkt; dafür gibt es den eigenen Release-Ordner (`release.md`, „Release-Ordner einrichten“). Jede Aktion gegen eine entfernte Datenbank nennt das Ziel mit `--project-ref`.
