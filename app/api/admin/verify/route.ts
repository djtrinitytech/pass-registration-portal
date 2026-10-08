import { staffApiError } from "@/lib/staff-auth";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeCode } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await staffApiError(request, "desk");
  if (authError) return authError;
  try {
    const body = await request.json();
    const query = normalizeCode(body.query ?? body.sapid ?? body.code);
    const isCode = /^[A-Z2-9]{6}$/.test(query);
    if (!isCode && !/^\d{7,20}$/.test(query)) return NextResponse.json({ error: "Enter a 6-character registration code or a valid numeric SAP ID." }, { status: 400 });

    const { data, error } = await supabase.from("registrations").select("id, name, sapid, email, phno, department, year, code, is_approved, is_entered, email_status, email_last_note, email_attempt_started_at").eq(isCode ? "code" : "sapid", query).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: `No registration found for that ${isCode ? "code" : "SAP ID"}.` }, { status: 404 });
    return NextResponse.json({ registration: data });
  } catch (error) {
    console.error("Admin lookup failed", error);
    return NextResponse.json({ error: "Unable to look up registration." }, { status: 500 });
  }
}
