import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

/**
 * Server-Client für Server Components, Server Actions und Route Handler.
 * Nutzt ebenfalls den anon key — die Session kommt aus dem Auth-Cookie, RLS
 * greift genauso wie im Browser-Client. Kein service_role-Zugriff hier.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll wird auch aus Server Components aufgerufen, die keine
            // Cookies schreiben dürfen — das ist ok, solange die Middleware
            // (middleware.ts) die Session ohnehin bei jedem Request auffrischt.
          }
        },
      },
    }
  );
}
