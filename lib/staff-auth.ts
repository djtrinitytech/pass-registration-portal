import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export type StaffRole = "desk" | "gate" | "super";
export const sessionSeconds = 2 * 60 * 60;
export function staffPassword(role: StaffRole) {
  return role === "desk" ? process.env.ADMIN_SECRET : role === "gate" ? process.env.GATE_SECRET : process.env.SUPER_ADMIN_SECRET;
}
export function authConfigured(role: StaffRole) {
  const secret = staffPassword(role);
  const otherSecrets = (["desk", "gate", "super"] as const).filter(other => other !== role).map(staffPassword);
  return Boolean(secret && secret.length >= 4 && !otherSecrets.includes(secret));
}
export function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function passwordValid(password: unknown, role: StaffRole) {
  const expected = staffPassword(role);
  return typeof password === "string" && Boolean(expected) && authConfigured(role) && timingSafeEqual(Buffer.from(digest(password)), Buffer.from(digest(expected!)));
}
export function cookieName(role: StaffRole) { return `${process.env.NODE_ENV === "production" ? "__Host-" : ""}trinity_${role}`; }
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };

export async function staffSession(role: StaffRole) {
  if (!authConfigured(role)) return false;
  const token = (await cookies()).get(cookieName(role))?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { data, error } = await supabase.from("staff_sessions").select("token_hash").eq("token_hash", digest(token)).eq("role", role).eq("credential_version", digest(staffPassword(role)!)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) { console.error("Staff session validation failed", error.code); return false; }
  return Boolean(data);
}
export async function requireStaffPage(role: StaffRole) {
  if (!await staffSession(role)) redirect(`/staff/login?role=${role}`);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = process.env.STAFF_AUTH_ORIGIN ?? new URL(request.url).origin;
  return origin === allowed && request.headers.get("sec-fetch-site") !== "cross-site";
}
export async function staffApiError(request: Request, role: StaffRole) {
  if (request.method !== "GET" && !sameOrigin(request)) return NextResponse.json({ error: "Request origin not allowed.", message: "Request origin not allowed." }, { status: 403 });
  if (!await staffSession(role)) return NextResponse.json({ error: "Sign in required.", message: "Sign in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return null;
}
export async function newSession(role: StaffRole) {
  const token = randomBytes(32).toString("hex");
  const { error } = await supabase.from("staff_sessions").insert({ token_hash: digest(token), role, credential_version: digest(staffPassword(role)!), expires_at: new Date(Date.now() + sessionSeconds * 1000).toISOString() });
  if (error) throw error;
  return token;
}
