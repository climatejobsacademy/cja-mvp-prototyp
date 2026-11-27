import { type NextRequest } from "next/server";

import { waehrendWartungErreichbar, wartungAn } from "@/lib/schalter";
import { updateSession } from "@/lib/supabase/middleware";
import { wartungsseiteHtml } from "@/lib/wartungsseite";

export async function middleware(request: NextRequest) {
  // Wartungsschalter (runbook.md, Abschnitt 6): vor Login und Datenbank,
  // damit die Seite auch steht, wenn dort der Fehler liegt.
  if (wartungAn() && !waehrendWartungErreichbar(request.nextUrl.pathname)) {
    return new Response(wartungsseiteHtml(), {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": "3600",
      },
    });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
