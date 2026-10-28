import type { NextConfig } from "next";

// Sicherheits-Header für alle Seiten (Anna 2026-10-28, vor dem Start):
// - X-Frame-Options SAMEORIGIN: keine Einbettung in fremde Seiten (Clickjacking);
//   gleiche Herkunft bleibt erlaubt, der SCORM-Player bettet eigene Inhalte ein.
// - X-Content-Type-Options nosniff: Dateien nur als ihr angegebener Typ.
// - Referrer-Policy: fremde Seiten sehen höchstens die Domain, keine Pfade.
// - Permissions-Policy: Kamera und Mikrofon nur für die eigene Seite (Fotos im
//   Praxisflow), Standort und Zahlungen aus.
// HTTPS erzwingt Vercel bereits (Strict-Transport-Security). Eine Content
// Security Policy folgt gesondert, weil sie Formeln, Fotos und Medien
// sorgfältig berücksichtigen muss.
const SICHERHEITS_HEADER = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SICHERHEITS_HEADER }];
  },
};

export default nextConfig;
