import { NextResponse } from "next/server";
import { authConfigured, cookieName, cookieOptions, digest, newSession, passwordValid, sameOrigin, sessionSeconds } from "@/lib/staff-auth";
import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
  try {
    const body = await request.json();
    if (body.role !== "desk" && body.role !== "gate" && body.role !== "super") return NextResponse.json({ error: "Select a staff role." }, { status: 400 });
    const role = body.role;
    if (!authConfigured(role)) return NextResponse.json({ error: "Staff sign-in has not been configured. Contact the organiser." }, { status: 503 });
    // On Vercel this header is set by the trusted proxy. Unknown clients share a conservative bucket.
    const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "local";
    const { data: allowed, error: limitError } = await supabase.rpc("staff_login_allowed", { bucket_key: digest(`staff-login:${ip}`) });
    if (limitError) { console.error("Staff login limiter unavailable", limitError.code); return NextResponse.json({ error: "Sign-in is temporarily unavailable. Contact the organiser." }, { status: 503 }); }
    if (allowed !== true) return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900" } });
    if (typeof body.password !== "string" || body.password.length > 256 || !passwordValid(body.password, role)) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    const token = await newSession(role);
    const response = NextResponse.json({ destination: role === "desk" ? "/admin" : role === "gate" ? "/gate" : "/super-admin" }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(cookieName(role), token, { ...cookieOptions, maxAge: sessionSeconds });
    return response;
  } catch (error) {
    console.error("Staff sign-in failed", error instanceof Error ? error.name : "Database error");
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
