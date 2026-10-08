import { NextResponse } from "next/server";
import { staffApiError } from "@/lib/staff-auth";
import { saveGmailSettings } from "@/lib/mail-settings";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const authError = await staffApiError(request, "super"); if (authError) return authError;
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  try {
    const { email, appPassword } = await request.json();
    await saveGmailSettings(email, appPassword);
    return NextResponse.json({ message: "Gmail sender verified and saved. New sends use this account. Active sends finish with their original sender." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update sender." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
