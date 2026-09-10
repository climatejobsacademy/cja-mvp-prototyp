import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Magic-Link-Rückkehrpunkt: tauscht den Code gegen eine Session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/schedule`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=login-fehlgeschlagen`);
}
