"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
export function StaffLogin({ role }: { role: "desk" | "gate" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch("/api/staff/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
      window.location.assign(result.destination);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to sign in."); setLoading(false); }
  }
  return <div className="staff-login-card"><p className="eyebrow">TRINITY · STAFF ACCESS</p><h1>{role === "desk" ? "Desk sign-in" : "Gate sign-in"}</h1><p>Sign in to {role === "desk" ? "verify attendees and issue passes" : "scan event entry passes"}.</p><form onSubmit={submit}><label><span>{role === "desk" ? "Desk password" : "Gate password"}</span><div className="input-wrap"><LockKeyhole size={18} /><input type="password" name="password" required maxLength={256} autoComplete="current-password" placeholder="Enter your staff password" /></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}</button></form><p className="staff-session-note">Staff access expires after two hours. Sign out when your shift ends.</p><Link href="/">Back to the event</Link></div>;
}
