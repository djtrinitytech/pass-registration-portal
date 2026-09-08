import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminSecretValid } from "@/lib/security";

const columns = ["name", "sapid", "phno", "email", "code", "is_approved", "is_entered", "created_at"] as const;

function csvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  try {
    const secret = request.headers.get("x-admin-secret");
    if (!isAdminSecretValid(secret)) return NextResponse.json({ error: "Invalid admin PIN" }, { status: 401 });
    const { data, error } = await supabase.from("registrations").select(columns.join(",")).order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as unknown as Array<Record<(typeof columns)[number], unknown>>;
    const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(","))].join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="event_registrations_${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Export failed", error);
    return NextResponse.json({ error: "Unable to export registrations." }, { status: 500 });
  }
}
