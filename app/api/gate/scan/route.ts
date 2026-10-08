import { staffApiError } from "@/lib/staff-auth";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await staffApiError(request, "gate");
  if (authError) return authError;
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ status: "invalid", message: "INVALID PASS" }, { status: 400 });

    const { data: student, error } = await supabase.from("registrations").select("id, name, sapid, is_approved, is_entered").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!student) return NextResponse.json({ status: "invalid", message: "INVALID PASS" }, { status: 404 });
    if (!student.is_approved) return NextResponse.json({ status: "not_approved", message: "NOT APPROVED BY DESK" }, { status: 403 });
    if (student.is_entered) return NextResponse.json({ status: "duplicate", message: "ALREADY USED! (Duplicate Scan)" }, { status: 409 });

    const { data: entered, error: updateError } = await supabase.from("registrations").update({ is_entered: true }).eq("id", id).eq("is_entered", false).select("name, sapid").maybeSingle();
    if (updateError) throw updateError;
    if (!entered) return NextResponse.json({ status: "duplicate", message: "ALREADY USED! (Duplicate Scan)" }, { status: 409 });
    return NextResponse.json({ status: "granted", message: `ENTRY GRANTED: ${entered.name} (SAP: ${entered.sapid})` });
  } catch (error) {
    console.error("Gate scan failed", error);
    return NextResponse.json({ status: "error", message: "Scanner service unavailable." }, { status: 500 });
  }
}
