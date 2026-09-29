Kopiere diesen Ordner in dein Repo (z. B. nach `docs/design_handoff_lernplattform/`) und gib Claude Code im Terminal:

---

Lies `docs/design_handoff_lernplattform/README.md` vollständig. Die HTML-Dateien in `design/` sind nur Referenzen – öffne `Lernplattform Richtungen v2.dc.html` bei Bedarf im Browser, kopiere aber keinen Code daraus.

Setze das Design in unserer bestehenden Next.js-App (App Router, shadcn/ui, Tailwind) um:
- Nur vorhandene shadcn-Komponenten, lucide-Icons und Tailwind-Klassen. Keine neuen Libraries, keine neuen Design-Tokens, kein Custom-CSS.
- Markenfarben nur über unsere bestehenden Tailwind-Farben (eco-green, eco-deep-green, charge-green, off-white, coral, lylac).
- Die Interaktions-Regeln und das Wording im README strikt einhalten.

Vorgehen:
1. Verschaff dir zuerst einen Überblick über die bestehende Struktur (Layout, Navigation, Status-Badge-Komponente, Karten) und schreib mir einen kurzen Plan, welche Dateien du änderst oder neu anlegst. Warte auf mein OK.
2. Dann in dieser Reihenfolge, jeweils mit kurzer Zusammenfassung danach:
   a) Kopfleiste (Programm, Nav inkl. neuem Reiter Home, Avatar-Menü) + mobile Bottom-Nav
   b) Seitenkopf (nur H1) und gemeinsame Bausteine (Segment-Fortschritt, Link-Zeile, Hover-Regeln)
   c) Home inkl. Leer-Variante „Heute“
   d) Stundenplan, Kompetenzen, Lernmaterialien inkl. leerem Zustand
   e) Login inkl. Fehler- und Gesendet-Zustand, Bild-Variante konfigurierbar
   f) Alle übrigen Screens, die nicht im Design sind (u. a. Praxis-Flow, Lektionsansicht): nach der Checkliste „Nicht gestaltete Screens“ im README angleichen – Buttons (nur die drei Varianten), Seitenkopf, Zurück-Link, Formulare, Status, Fortschritt, Hover, Wording. Nichts neu erfinden. Liste mir vorher auf, welche Screens du dafür gefunden hast und was du je Screen änderst.
3. Prüfe am Ende: Touch-Ziele ≥ 44 px, Fokus-Ringe, `aria-current`, `sr-only`-Werte an Segmentbalken, 320 px ohne horizontales Scrollen.

Die offenen Punkte im README nicht selbst entscheiden – markiere sie mit `// TODO(design):`.
