import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

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

  // getUser() macht einen Netzwerk-Request an Supabase Auth — ohne (oder mit
  // unerreichbarem) Supabase-Projekt soll das nicht die ganze Seite (auch
  // /login) mit einem 500er lahmlegen, sondern wie "nicht eingeloggt" behandelt
  // werden.
  let user = null;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
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

  return supabaseResponse;
}
