// Wartungsseite als fertiges HTML (Entscheidung Geschäftsführung 18.10.2026,
// docs/runbook.md Abschnitt 6). Bewusst ohne React, Layout, Login und
// Datenbank: Die Seite muss auch dann stehen, wenn genau dort der Fehler
// liegt. Farben aus den Design-Tokens (docs/design-specifications.md):
// Seite #FAFAF7, Text Eco Deep Green #23321E, Links Lylac dunkel #6E44D6.

export const WARTUNG_TITEL = "Wartung – Lernplattform";

export function wartungsseiteHtml(): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${WARTUNG_TITEL}</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #FAFAF7; color: #23321E; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 32rem; margin: 1rem; padding: 2rem; background: #fff; border-radius: 26px;
    box-shadow: 0 1px 3px rgba(35, 50, 30, 0.08); }
  h1 { font-size: 1.5rem; margin: 0 0 1rem; }
  p { line-height: 1.6; margin: 0 0 1rem; }
  nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; font-size: 0.9rem; }
  a { color: #6E44D6; }
  a:focus-visible { outline: 2px solid #6E44D6; outline-offset: 2px; }
</style>
</head>
<body>
<main>
  <h1>Wir sind gleich wieder da</h1>
  <p>Die Lernplattform ist gerade wegen Wartungsarbeiten nicht erreichbar. Deine Daten sind sicher.</p>
  <p>Bitte versuch es später noch einmal. Bei dringenden Fragen wende dich an deine Ansprechperson bei der Academy for Climate Jobs.</p>
  <nav aria-label="Rechtliches">
    <a href="/impressum">Impressum</a>
    <a href="/datenschutz">Datenschutz</a>
    <a href="/barrierefreiheit">Barrierefreiheit</a>
  </nav>
</main>
</body>
</html>`;
}
