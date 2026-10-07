"use client";



import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Download, LockKeyhole, Mail, Search, ShieldCheck, Smartphone, UserRound, X } from "lucide-react";
import type { Registration } from "@/lib/types";

export function AdminPortal() {
  const [secret, setSecret] = useState("");
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
      const response = await fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, code }) });
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
      const response = await fetch("/api/admin/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, code: registration.code }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRegistration({ ...registration, is_approved: true });
      setMessage({ type: "success", text: "Pass issued and QR code emailed." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Approval failed." }); }
    finally { setLoading(false); }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const response = await fetch("/api/admin/export", { headers: { "x-admin-secret": secret } });
      if (!response.ok) throw new Error((await response.json()).error ?? "Export failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `event_registrations_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Export failed." }); }
    finally { setExporting(false); }
  }

  return <div className="admin-shell"><header className="portal-header"><div><p className="eyebrow">Desk operations</p><h1>Issue entry passes</h1></div><button className="secondary-button" disabled={!secret || exporting} onClick={exportCsv} type="button"><Download size={17} /> {exporting ? "Preparing..." : "Sync & export CSV"}</button></header><section className="admin-panel"><div className="admin-toolbar"><label className="secret-field"><LockKeyhole size={17} /><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="Admin PIN" aria-label="Admin PIN" /></label><form className="code-search" onSubmit={lookup}><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ENTER CODE" aria-label="Registration code" /><button className="search-button" disabled={loading || !secret} type="submit"><Search size={18} /> Find</button></form></div>{message && <div className={`status-message ${message.type}`}><span>{message.type === "success" ? <Check size={18} /> : <X size={18} />}</span>{message.text}</div>}{registration ? <div className="attendee-card fade-up"><div className="attendee-heading"><div className="avatar"><UserRound /></div><div><p className="eyebrow">Registration {registration.code}</p><h2>{registration.name}</h2></div><span className={`status-badge ${registration.is_approved ? "approved" : "pending"}`}>{registration.is_approved ? "Already approved" : "Pending"}</span></div><div className="attendee-details"><span><ShieldCheck size={17} /> {registration.sapid}</span><span><Smartphone size={17} /> {registration.phno}</span><span><Mail size={17} /> {registration.email}</span>{registration.department && <span>{registration.department}</span>}{registration.year && <span>Year {registration.year}</span>}</div>{registration.is_approved ? <div className="already-issued"><Check size={20} /> This pass has already been issued.</div> : <button className="issue-button" disabled={loading} onClick={approve} type="button"><ShieldCheck size={19} /> {loading ? "Issuing pass..." : "Verify & issue pass"}</button>}</div> : <div className="empty-state"><Search size={30} /><h2>Ready for the next attendee</h2><p>Enter the six-character code from their confirmation screen to verify their details.</p></div>}</section><Link className="back-link" href="/"><ArrowLeft size={16} /> Back to registration</Link></div>;
}
