// Schalter für Demo-Funktionen, die nicht nach dev sollen (Anna 2026-10-12).
//
// Sprachtraining (SR-24, SR-31) gibt es vorerst nur für die Investoren-Demo:
// an auf dem Branch demo (Vercel-Vorschau) und lokal mit `npm run dev`, aus
// auf jedem anderen Deployment (dev, main/Production). Rutscht beim
// Übernehmen nach dev Sprach-Code mit, bleibt er dort unsichtbar. Will das
// Team das Sprachtraining anbieten: hier bewusst einschalten -- und vorher
// Inhalte aus der Datenbank, Fortschritt und fachliche Prüfung ergänzen
// (siehe Notion-Umsetzungsplan).
//
// NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF setzt Vercel automatisch (Branch des
// Deployments), NEXT_PUBLIC_VERCEL_ENV gibt es nur auf Vercel.
export const SPRACHTRAINING_DEMO =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF === "demo" ||
  (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_VERCEL_ENV);
