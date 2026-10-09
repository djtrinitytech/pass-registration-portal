"use client";
import { StaffLogout } from "@/components/staff-logout";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, RotateCcw, ShieldAlert, X } from "lucide-react";

type ScanResult = { tone: "success" | "danger"; title: string; message: string } | null;
export function GateScanner() {
  const locked = useRef(false);
  const lastScan = useRef({ value: "", ignoreUntil: 0 });
  const dismissButton = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<ScanResult>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  function dismiss() {
    lastScan.current.ignoreUntil = Date.now() + 2000;
    setResult(null); locked.current = false;
  }
  useEffect(() => { if (result) dismissButton.current?.focus(); }, [result]);
  useEffect(() => {
    let active = true;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    let running = false;
    let pending: AbortController | undefined;
    async function dispose() {
      if (!scanner || !running) return;
      running = false;
      try { await scanner.stop(); scanner.clear(); } catch { /* Camera may already be released. */ }
    }
    async function start() {
      setCameraError(""); setReady(false);
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!active) return;
      scanner = new Html5Qrcode("gate-reader");
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: (width, height) => { const size = Math.min(250, Math.floor(Math.min(width, height) * 0.8)); return { width: size, height: size }; }, aspectRatio: 1 }, async decodedText => {
        if (!active || locked.current || (decodedText === lastScan.current.value && Date.now() < lastScan.current.ignoreUntil)) return;
        locked.current = true; lastScan.current.value = decodedText; setChecking(true);
        pending = new AbortController();
        const timeout = window.setTimeout(() => pending?.abort(), 15000);
        try {
          const response = await fetch("/api/gate/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: decodedText }), signal: pending.signal });
          if (!active) return;
          if (response.status === 401) { window.location.assign("/staff/login?role=gate"); return; }
          const data = await response.json();
          if (active) setResult({ tone: response.ok ? "success" : "danger", title: response.ok ? "Access granted" : response.status >= 500 ? "Verification unavailable" : "Access denied", message: data.message ?? data.error ?? "Unable to verify this pass." });
        } catch {
          if (active) setResult({ tone: "danger", title: "Verification unavailable", message: "Could not confirm entry. Check with the desk before rescanning this pass." });
        } finally { window.clearTimeout(timeout); pending = undefined; if (active) setChecking(false); }
      }, () => undefined);
      running = true;
      if (!active) { await dispose(); return; }
      setReady(true);
    }
    start().catch(() => { if (active) { setReady(false); setCameraError("Unable to start the camera. Allow camera access, close other apps using it, then try again."); } });
    return () => { active = false; pending?.abort(); void dispose(); };
  }, [cameraAttempt]);

  return <main className="gate-screen"><StaffLogout /><div className="gate-topbar"><div className="gate-brand"><span>ENTRY CONTROL</span></div><span className="live-pill"><i /> {ready ? "Scanner live" : "Starting camera"}</span></div>
    <section className="scanner-stage"><div className="scanner-heading"><p className="eyebrow">Gate A / Live verification</p><h1>Scan entry pass</h1><p>Point the back camera at the attendee QR code.</p></div><div className="reader-frame"><div id="gate-reader" /><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" /></div>
    {cameraError ? <div className="camera-error" role="alert"><p>{cameraError}</p><button type="button" onClick={() => setCameraAttempt(value => value + 1)}>Try camera again</button></div> : <div className="scanner-status" role="status"><span className="pulse-dot" /> {checking ? "Verifying pass…" : result ? "Dismiss the result to scan the next pass" : "Waiting for a pass"}<span className="divider" /> Keep the code inside the frame</div>}</section>
    {result && <div className="scan-popup-backdrop" onClick={dismiss}><section className={`scan-popup ${result.tone}`} role="dialog" aria-modal="true" aria-labelledby="scan-popup-title" aria-describedby="scan-popup-message" onKeyDown={event => { if (event.key === "Escape") dismiss(); if (event.key === "Tab") { event.preventDefault(); dismissButton.current?.focus(); } }}><button ref={dismissButton} className="scan-popup-close" type="button" onClick={event => { event.stopPropagation(); dismiss(); }} aria-label="Dismiss scan result"><X size={22} /></button><div className="result-icon">{result.tone === "success" ? <CheckCircle2 /> : <ShieldAlert />}</div><h2 id="scan-popup-title">{result.title}</h2><p id="scan-popup-message">{result.message}</p><p className="scan-popup-hint">Tap to dismiss and scan the next pass</p></section></div>}
    <p className="gate-footer"><RotateCcw size={14} /> Duplicate scans are blocked automatically</p></main>;
}
