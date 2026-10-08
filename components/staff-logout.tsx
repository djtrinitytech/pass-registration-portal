"use client";
import { type ReactNode, useState } from "react";
export function StaffLogout({ children }: { children?: ReactNode }) {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/staff/logout", { method: "POST" }); if (!response.ok) throw new Error("Sign-out failed. Try again."); window.location.assign("/"); }
    catch { setError("Sign-out failed. Try again."); setLoading(false); }
  }
  return <div className="staff-logout">{children}<button type="button" onClick={logout} disabled={loading}>{loading ? "Signing out…" : "Sign out"}</button>{error && <span role="alert">{error}</span>}</div>;
}
