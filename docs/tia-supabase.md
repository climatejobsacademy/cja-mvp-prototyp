# Risikoanalyse Drittlandübermittlung (Transfer Impact Assessment): Supabase

Stand 18.10.2026 · **Entwurf** (Anna mit Claude), keine rechtliche Prüfung. Gehört zum Verzeichnis der Verarbeitungstätigkeiten (`docs/verarbeitungsverzeichnis.md`).

## 1. Übermittlung

- **Dienst:** Supabase (Datenbank, Login, Dateispeicher) für die Lernplattform learn.climatejobsacademy.com.
- **Speicherort:** Server in der EU, AWS Frankfurt (eu-central-1). Die Daten werden dort gespeichert und verarbeitet.
- **Wo eine Übermittlung in ein Drittland entstehen kann:** Fernzugriff von Supabase-Personal (Support, Betrieb, Sicherheit) aus Ländern außerhalb der EU sowie Unterauftragsverarbeiter laut Liste von Supabase. **Vertragspartei ist Supabase Pte. Ltd., Singapur** (DPA „Version 1 — August 1, 2026“, gelesen 18.10.2026; das DPA gilt ab Beginn der Nutzung, eine gesonderte Unterschrift ist nicht nötig). Zur Unternehmensgruppe gehört auch Supabase, Inc. in den USA.
- **Rechtsgrundlage der Übermittlung:** Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO, Durchführungsbeschluss (EU) 2021/914), Bestandteil des DPA von Supabase. Für Singapur gibt es keinen Angemessenheitsbeschluss; eine Zertifizierung von Supabase nach dem EU-US Data Privacy Framework ist uns nicht bekannt.

## 2. Daten und Personen

- **Personen:** Lernende im Pilot (9 Personen ab 02.11.2026), Trainer:innen, Team der Akademie.
- **Daten:** Konto- und Kontaktdaten, Rufname, freiwilliges Profilfoto, Lernfortschritt, Anwesenheit, Praxisberichte, Prüfentscheidungen, ggf. Chat- und Thread-Beiträge.
- **Keine besonderen Kategorien** nach Art. 9 DSGVO (z. B. Gesundheit, Religion) vorgesehen. Das Feld „Geschlecht“ ist keine besondere Kategorie.

## 3. Rechtslage im Drittland (Kurzfassung)

- **USA:** Behörden können nach US-Recht (u. a. FISA Section 702, Executive Order 12333) unter Umständen Zugriff auf Daten verlangen, die ein US-Unternehmen kontrolliert, auch wenn sie in der EU liegen. Seit dem Data Privacy Framework (2023) gibt es zusätzliche Schutzmechanismen (Executive Order 14086, Rechtsbehelf für EU-Personen); sie gelten allgemein für Übermittlungen in die USA, unabhängig von einer Zertifizierung.
- **Singapur:** kein Angemessenheitsbeschluss; Zugriff von Behörden nach dortigem Recht möglich.

## 4. Maßnahmen

- **Vertraglich:** Standardvertragsklauseln im DPA; Pflicht von Supabase, über Behördenanfragen zu informieren, soweit zulässig (laut DPA, nicht im Einzelnen geprüft).
- **Technisch (Angaben von Supabase, nicht selbst geprüft):** Verschlüsselung bei der Übertragung (TLS) und der Speicherung; Zugriff des Personals beschränkt.
- **Auf unserer Seite:** Speicherort Frankfurt; Zugriffsrechte in der Datenbank je Rolle und Kohorte (Row Level Security); Dateien nur über zeitlich begrenzte Links; keine Personendaten in App-Logs; Datensparsamkeit (keine Fotos Dritter, keine Uploads außer Profilfoto im Pilot).

## 5. Bewertung

- **Wahrscheinlichkeit eines Behördenzugriffs:** gering. Die Daten sind Lern- und Qualifizierungsdaten einer kleinen Gruppe ohne erkennbares Interesse für Nachrichtendienste.
- **Schwere für die Personen:** gering bis mittel (Lernstand, Anwesenheit, Kontaktdaten; keine besonderen Kategorien).
- **Ergebnis:** Die Übermittlung ist mit den Standardvertragsklauseln und den genannten Maßnahmen vertretbar. Neu bewerten, wenn sich der Vertragspartner, die Datenarten (z. B. Praxisfotos mit Dritten ab dem Praxisflow) oder die Rechtslage ändern.

## Offen

- Liste der Unterauftragsverarbeiter von Supabase einmal ansehen und ablegen.
- Neu bewerten vor dem Praxisflow (Fotos und Medien, ab 16.11.2026).
