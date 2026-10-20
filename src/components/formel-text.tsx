import katex from "katex";
import "katex/dist/katex.min.css";

// Formeln in Texten aus Elephant (SR-85, Anna 2026-10-20): Formel-Blöcke als
// LaTeX zwischen $$ … $$ (z. B. $$P_V=I^2\cdot R$$), Formeln mitten im Satz
// als \( … \) (beim Einlesen aus Elephants inline-math, elephant-kurs.ts).
// Einzelne $-Zeichen bleiben Text. KaTeX erzeugt
// das Formel-HTML ohne Links oder eigene Befehle (trust: false); bei einem
// Fehler im LaTeX steht die Formel als Text da statt einer Fehlermeldung.

// Ohne g-Flag für die Prüfung: ein globales test() verschiebt lastIndex, und
// matchAll übernähme diese Stelle (dann würde keine Formel gefunden).
const FORMEL_DA = /\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)/;
const FORMEL = /\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;

/** Hat der Text eine Formel? */
export function hatFormel(text: string): boolean {
  return FORMEL_DA.test(text);
}

/** Text mit Formeln: Formeln gerendert, der Rest bleibt Text. Steht nur eine Formel da, als eigene Zeile. */
export function FormelText({ text }: { text: string }) {
  if (!hatFormel(text)) return <>{text}</>;
  const teile: React.ReactNode[] = [];
  // Als eigene Zeile nur ein Formel-Block ($$), der allein dasteht.
  const allein = text.trim().startsWith("$$") && text.trim().endsWith("$$") && text.trim().slice(2, -2).indexOf("$$") === -1;
  let rest = 0;
  for (const m of text.matchAll(FORMEL)) {
    if (m.index > rest) teile.push(text.slice(rest, m.index));
    const block = m[1] !== undefined;
    const html = katex.renderToString(block ? m[1] : m[2], {
      throwOnError: false,
      displayMode: block && allein,
      trust: false,
      strict: "ignore",
    });
    teile.push(
      <span key={m.index} className={block && allein ? "block overflow-x-auto py-1" : undefined} dangerouslySetInnerHTML={{ __html: html }} />
    );
    rest = m.index + m[0].length;
  }
  if (rest < text.length) teile.push(text.slice(rest));
  return <>{teile}</>;
}
