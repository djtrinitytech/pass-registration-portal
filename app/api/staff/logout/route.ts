import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieName, cookieOptions, digest, sameOrigin } from "@/lib/staff-auth";
import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
  const store = await cookies();
  const tokens = (["desk", "gate"] as const).map(role => store.get(cookieName(role))?.value).filter((token): token is string => Boolean(token && /^[a-f0-9]{64}$/.test(token)));
  if (tokens.length) {
    const { error } = await supabase.from("staff_sessions").delete().in("token_hash", tokens.map(digest));
    if (error) return NextResponse.json({ error: "Unable to sign out. Please try again." }, { status: 503 });
  }
  const response = NextResponse.json({ ok: true });
  for (const role of ["desk", "gate"] as const) response.cookies.set(cookieName(role), "", { ...cookieOptions, maxAge: 0 });
  return response;
}
