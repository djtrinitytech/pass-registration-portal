"use client";

import { FormEvent, useState } from "react";
import { departments, years } from "@/lib/event";
import { ArrowRight, Check, Copy, Mail, ShieldCheck, Ticket, UserRound } from "lucide-react";

export function RegistrationForm() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Registration failed.");
      setCode(result.code);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  if (code) {
    return <section className="success-card fade-up" aria-live="polite"><div className="success-icon"><Check size={28} /></div><p className="eyebrow">Registration confirmed</p><h2>Your event code</h2><div className="code-display">{code}</div><button className="copy-button" onClick={copyCode} type="button">{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy code"}</button><div className="notice"><Ticket size={22} /><p><strong>Take a screenshot of this screen!</strong><br />Show this code at the physical desk to get your entry pass.</p></div><p className="muted">A confirmation email is not required. Keep this code accessible when you arrive.</p></section>;
  }

  return <form className="registration-form fade-up" onSubmit={submit}><div className="form-grid"><label><span>Full name</span><div className="input-wrap"><UserRound size={18} /><input name="name" required placeholder="samarth bhirud" autoComplete="name" /></div></label><label><span>SAP ID</span><div className="input-wrap"><ShieldCheck size={18} /><input name="sapid" required placeholder="60018250011" /></div></label><label><span>Phone number</span><div className="input-wrap"><span className="country-code">+91</span><input name="phno" required autoComplete="tel-national" inputMode="tel" placeholder="8408917498" /></div></label><label><span>Email address</span><div className="input-wrap"><Mail size={18} /><input name="email" type="email" required placeholder="you@gmail.com" autoComplete="email" /></div></label><label><span>Department</span><select name="department" required defaultValue=""><option value="" disabled>Select your department</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></label><label><span>Year of study</span><select name="year" required defaultValue=""><option value="" disabled>Select your year</option>{years.map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading} type="submit">{loading ? "Creating your pass..." : <>Reserve my entry <ArrowRight size={18} /></>}</button><p className="form-footnote"><ShieldCheck size={15} /> Your details are used only to issue and verify your event pass.</p></form>;
}
