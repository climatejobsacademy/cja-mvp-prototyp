import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

/**
 * Browser-Client für Client Components. Nutzt den anon key — jeder Zugriff
 * läuft durch RLS (siehe supabase/migrations/0009_rls_policies.sql), es gibt
 * hier keinen erhöhten Zugriff.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
