"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StaffLogout } from "@/components/staff-logout";

type Issue = { code: string; name: string; email: string; email_status: string; email_last_note: string | null; email_attempt_started_at: string | null };
type Dashboard = {
  configuration: { provider: string; sender: string; configured: boolean; canChangeSender: boolean };
  control: { paused: boolean; note: string; daily_budget: number };
  used: number;
  registrations: Issue[];
  attempts: { id: string; status: string; started_at: string; note: string; registrations: { code: string; name: string; email: string } | null }[];
};
export function SuperAdminPortal() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const load = useCallback(async () => {
    const response = await fetch("/api/super-admin/mail", { cache: "no-store" });
    if (response.status === 401) { window.location.assign("/staff/login?role=super"); return; }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to load email activity.");
    setData(result);
  }, []);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  async function act(path: string, body: object) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (response.status === 401) { window.location.assign("/staff/login?role=super"); return; }
      const result = await response.json();
      await load();
      if (!response.ok) throw new Error(result.error ?? "Action failed.");
      setMessage(result.message ?? "Sending settings updated."); setReviewed({}); setAppPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  }
  return <div className="admin-shell"><StaffLogout /><header className="portal-header"><div><p className="eyebrow">Owner access</p><h1>Email operations</h1></div><button type="button" className="secondary-button" disabled={busy} onClick={() => { setError(""); load().catch(e => setError(e.message)); }}>Refresh</button></header>
    {error && <p role="alert" className="status-message error">{error}</p>}{message && <p role="status" className="status-message success">{message}</p>}
    {data && <><section className="admin-panel"><h2>Sending status</h2><p><strong>{data.configuration.provider}</strong> · {data.configuration.sender || "Sender not configured"}</p><p>{data.configuration.configured ? "Sender configuration present" : "Set sender credentials before sending"}</p><p><strong>{data.used} / {data.control.daily_budget}</strong> accepted, uncertain or active sends for this sender in the last 24 hours.</p><p>This safety budget covers this website only. Gmail activity elsewhere also counts towards Google’s limit. SMTP acceptance does not guarantee inbox delivery.</p><p><strong>{data.control.paused ? "Sending paused" : "Sending enabled"}</strong>{data.control.note && ` — ${data.control.note}`}</p><button className="secondary-button" type="button" disabled={busy} onClick={() => act("/api/super-admin/mail", { paused: !data.control.paused })}>{data.control.paused ? "Resume sending" : "Pause sending"}</button></section>
    <section className="admin-panel owner-section"><h2>Change Gmail sender</h2><p>Use an account you control with available sending allowance. Its app password is encrypted before storage and is never displayed again. Existing sending counts remain when you switch back to an account.</p>{!data.configuration.canChangeSender && <p role="alert">Set MAIL_SETTINGS_KEY in Vercel and redeploy to enable secure credential storage.</p>}<form className="owner-sender" onSubmit={e => { e.preventDefault(); act("/api/super-admin/sender", { email, appPassword }); }}><label>Gmail address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your-event-account@gmail.com" autoComplete="off" required maxLength={254} /></label><label>Gmail app password<input type="password" value={appPassword} onChange={e => setAppPassword(e.target.value)} placeholder="16-character app password" autoComplete="new-password" required maxLength={32} /></label><button type="submit" className="secondary-button" disabled={busy || !data.configuration.canChangeSender}>{busy ? "Working…" : "Verify & save sender"}</button></form></section>
    <section className="admin-panel owner-section"><h2>Emails needing attention</h2><p>Check uncertain sends in the sender’s Sent folder and with the recipient before retrying. Retrying an uncertain send can deliver a duplicate email.</p>{data.registrations.length === 0 && <p>No emails need attention.</p>}
      {data.registrations.map(student => {
        const uncertain = student.email_status !== "failed";
        const active = student.email_status === "sending" && (!student.email_attempt_started_at || Date.now() - new Date(student.email_attempt_started_at).getTime() < 300000);
        return <article className="attendee-card owner-card" key={student.code}><h3>{student.name} · {student.code}</h3><p className="owner-email">{student.email}</p><p><strong>{student.email_status === "sending" ? "Send in progress / outcome not recorded" : student.email_status}</strong></p><p>{student.email_last_note}</p>{uncertain && !active && <label className="owner-review"><input type="checkbox" checked={!!reviewed[student.code]} onChange={e => setReviewed({ ...reviewed, [student.code]: e.target.checked })} /> I checked the previous send and accept the duplicate-email risk.</label>}<button className="secondary-button" type="button" disabled={busy || data.control.paused || active || (uncertain && !reviewed[student.code])} onClick={() => act("/api/super-admin/retry", { code: student.code, confirmUncertain: uncertain })}>{active ? "Wait for the active send" : "Retry email"}</button></article>;
      })}</section>
    <section className="admin-panel owner-section"><h2>Latest 50 sending attempts</h2>{data.attempts.length === 0 && <p>No sending attempts yet.</p>}{data.attempts.map(attempt => <article key={attempt.id} className="owner-attempt"><strong>{attempt.registrations?.code ?? "Pass"} · {attempt.status}</strong><p>{new Date(attempt.started_at).toLocaleString()}</p><p>{attempt.note || "Awaiting mail provider response."}</p></article>)}</section></>}
    <Link className="back-link" href="/admin">Back to desk</Link></div>;
}
