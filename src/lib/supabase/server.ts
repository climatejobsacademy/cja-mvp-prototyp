import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import type { Database } from "@/lib/database.types";

/**
 * Server-Client für Server Components, Server Actions und Route Handler.
 * Nutzt ebenfalls den anon key — die Session kommt aus dem Auth-Cookie, RLS
 * greift genauso wie im Browser-Client. Kein service_role-Zugriff hier.
 *
 * Mit React `cache()` gewrappt: ein Client pro Request statt einer pro
 * Abfragefunktion. Jeder Client frischt ein abgelaufenes Token selbst auf;
 * mehrere parallele Clients schickten dasselbe Refresh-Token mehrfach
 * (refresh_token_already_used, 429), danach liefen Abfragen mit dem anon key
 * und lieferten still leere Daten. So gibt es höchstens einen Refresh pro
 * Request. In Server Actions und Route Handlern wirkt `cache()` nicht, dort
 * entsteht weiter pro Aufruf ein neuer Client.
 */
export const createClient = cache(async () => {
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
});
