import { staffApiError } from "@/lib/staff-auth";
import { issuePassEmail } from "@/lib/pass-email";
import { normalizeCode } from "@/lib/security";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const authError = await staffApiError(request, "desk");
  if (authError) return authError;
  try {
    const { code: rawCode } = await request.json();
    const code = normalizeCode(rawCode);
    if (!/^[A-Z2-9]{6}$/.test(code)) return NextResponse.json({ error: "Enter a valid 6-character code." }, { status: 400 });
    const result = await issuePassEmail(code);
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Pass issuance failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Email service unavailable. Contact the super admin." }, { status: 503 });
  }
}
