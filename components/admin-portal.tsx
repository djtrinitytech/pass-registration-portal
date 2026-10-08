"use client";



import { StaffLogout } from "@/components/staff-logout";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Download, Mail, Search, ShieldCheck, Smartphone, UserRound, X } from "lucide-react";
import type { Registration } from "@/lib/types";

export function AdminPortal() {
  const [code, setCode] = useState("");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const response = await fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (response.status === 401) { window.location.assign("/staff/login?role=desk"); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRegistration(result.registration);
    } catch (error) {
      setRegistration(null);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Lookup failed." });
    } finally { setLoading(false); }
  }

  async function approve() {
    if (!registration) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: registration.code }) });
      if (response.status === 401) { window.location.assign("/staff/login?role=desk"); return; }
      const result = await response.json();
      const refreshed = await fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: registration.code }) });
      if (refreshed.ok) setRegistration((await refreshed.json()).registration);
      if (!response.ok) throw new Error(result.error);
      setMessage({ type: "success", text: "Pass approved. Email accepted by the mail provider." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Approval failed." }); }
    finally { setLoading(false); }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const response = await fetch("/api/admin/export");
      if (!response.ok) throw new Error((await response.json()).error ?? "Export failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `event_registrations_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Export failed." }); }
    finally { setExporting(false); }
  }

  return <div className="admin-shell"><StaffLogout /><header className="portal-header"><div><p className="eyebrow">Desk operations</p><h1>Issue entry passes</h1></div><button className="secondary-button" disabled={exporting} onClick={exportCsv} type="button"><Download size={17} /> {exporting ? "Preparing..." : "Sync & export CSV"}</button></header><section className="admin-panel"><div className="admin-toolbar"><form className="code-search" onSubmit={lookup}><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ENTER CODE" aria-label="Registration code" /><button className="search-button" disabled={loading} type="submit"><Search size={18} /> Find</button></form></div>{message && <div className={`status-message ${message.type}`}><span>{message.type === "success" ? <Check size={18} /> : <X size={18} />}</span>{message.text}</div>}{registration ? <div className="attendee-card fade-up"><div className="attendee-heading"><div className="avatar"><UserRound /></div><div><p className="eyebrow">Registration {registration.code}</p><h2>{registration.name}</h2></div><span className={`status-badge ${registration.is_approved ? "approved" : "pending"}`}>{registration.is_approved ? "Already approved" : "Pending"}</span></div><div className="attendee-details"><span><ShieldCheck size={17} /> {registration.sapid}</span><span><Smartphone size={17} /> {registration.phno}</span><span><Mail size={17} /> {registration.email}</span>{registration.department && <span>{registration.department}</span>}{registration.year && <span>Year {registration.year}</span>}</div><p>Email status: <strong>{registration.email_status}</strong></p>{registration.email_last_note && <p>{registration.email_last_note}</p>}{["pending", "failed"].includes(registration.email_status) ? <button className="issue-button" disabled={loading || registration.is_entered} onClick={approve} type="button"><ShieldCheck size={19} /> {loading ? "Sending..." : registration.email_status === "failed" ? "Retry pass email" : "Verify & issue pass"}</button> : <div className="already-issued"><Check size={20} /> {registration.email_status === "sent" ? "Email accepted by the mail provider." : registration.email_status === "sending" ? "Email attempt in progress. Do not resend." : "Uncertain email outcome — ask the super admin to review."}</div>}</div> : <div className="empty-state"><Search size={30} /><h2>Ready for the next attendee</h2><p>Enter the six-character code from their confirmation screen to verify their details.</p></div>}</section><Link className="back-link" href="/super-admin">Owner email controls</Link><Link className="back-link" href="/"><ArrowLeft size={16} /> Back to registration</Link></div>;
}
