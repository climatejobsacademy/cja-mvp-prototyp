// YouTube-Videos in Lektionen (SR folgt; Asana-Karte „YouTube-Videos in
// Lektionen einbettbar machen“). Ein Link-Eintrag an der Lektion
// (lesson_resource, typ link) mit einer YouTube-Adresse wird als Video
// gezeigt statt als Link. Reine Funktionen, getestet in src/lib/youtube.test.ts.
//
// Datenschutz: eingebettet wird nur über youtube-nocookie.com, und erst nach
// einem Klick (Zwei-Klick-Lösung); vorher wird nichts von YouTube geladen,
// auch kein Vorschaubild.

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtube-nocookie.com", "youtube-nocookie.com"]);

/** Video-Kennung aus einer YouTube-Adresse (watch, youtu.be, embed, shorts, live), sonst null. Nur https. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !HOSTS.has(u.hostname.toLowerCase())) return null;
  const teile = u.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (u.hostname.toLowerCase() === "youtu.be") id = teile[0] ?? null;
  else if (teile[0] === "watch") id = u.searchParams.get("v");
  else if (["embed", "shorts", "live", "v"].includes(teile[0] ?? "")) id = teile[1] ?? null;
  return id && ID.test(id) ? id : null;
}

/** Startzeit in Sekunden aus „t“ oder „start“ (z. B. 90, 90s, 1m30s), sonst null. */
export function startSekunden(url: string): number | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const roh = u.searchParams.get("t") ?? u.searchParams.get("start");
  if (!roh) return null;
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(roh);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  const s = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return s > 0 ? s : null;
}

/**
 * Adresse für den Player (youtube-nocookie): Untertitel an, deutsch bevorzugt,
 * keine Vorschläge fremder Kanäle am Ende, optional mit Startzeit. Autoplay,
 * weil das Laden schon ein bewusster Klick war.
 */
export function einbettAdresse(id: string, start: number | null = null): string {
  const p = new URLSearchParams({ cc_load_policy: "1", cc_lang_pref: "de", hl: "de", rel: "0", autoplay: "1" });
  if (start) p.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
}
