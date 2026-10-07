import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminSecretValid, normalizeCode } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { secret, code: rawCode } = await request.json();
    if (!isAdminSecretValid(secret)) return NextResponse.json({ error: "Invalid admin PIN" }, { status: 401 });

    const code = normalizeCode(rawCode);
    if (!/^[A-Z2-9]{6}$/.test(code)) return NextResponse.json({ error: "Enter a valid 6-character code." }, { status: 400 });

    const { data, error } = await supabase.from("registrations").select("id, name, sapid, email, phno, code, is_approved").eq("code", code).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "No registration found for that code." }, { status: 404 });
    return NextResponse.json({ registration: data });
  } catch (error) {
    console.error("Admin lookup failed", error);
    return NextResponse.json({ error: "Unable to look up registration." }, { status: 500 });
  }
}
