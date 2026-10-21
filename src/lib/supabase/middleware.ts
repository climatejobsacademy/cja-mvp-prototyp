import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  // SR-60: gesetzlich vorgeschriebene Seiten, bewusst ohne Login erreichbar.
  "/impressum",
  "/datenschutz",
  "/barrierefreiheit",
];

/**
 * Frischt die Auth-Session bei jedem Request auf (Supabase-Standardmuster für
 * Next.js Middleware) und schickt nicht eingeloggte Personen auf /login.
 * Rollen-/Org-Zugriff selbst wird nicht hier, sondern von RLS entschieden
 * (0009_rls_policies.sql) — diese Middleware kennt nur "eingeloggt oder nicht".
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getClaims() frischt eine abgelaufene Sitzung auf (dann ein Request an
  // Supabase Auth) und prüft das Token sonst lokal über den öffentlichen
  // Schlüssel (asymmetrische Signier-Schlüssel, ECC P-256) -- spart bei jedem
  // Seitenwechsel die Rundreise, die getUser() machte (Ladezeit, Anna
  // 2026-10-21). Fehler (z. B. Supabase nicht erreichbar) legen nicht die
  // ganze Seite (auch /login) mit einem 500er lahm, sondern gelten als "nicht
  // eingeloggt".
  let user: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims.sub ?? null;
  } catch {
    user = null;
  }

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Verhindert, dass der Browser (bfcache) eine geschützte Seite nach dem
  // Logout beim Zurück-Navigieren aus dem Cache statt per Request zeigt --
  // ohne diesen Header könnte der alte, eingeloggte Zustand kurz sichtbar
  // bleiben, bevor überhaupt wieder die Middleware läuft.
  if (!isPublicPath) {
    supabaseResponse.headers.set("Cache-Control", "no-store");
  }

  return supabaseResponse;
}
