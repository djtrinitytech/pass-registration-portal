"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";

type ScanResult = { tone: "success" | "danger"; message: string } | null;

export function GateScanner() {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [result, setResult] = useState<ScanResult>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("gate-reader");
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 }, async (decodedText: string) => {
        if (!active) return;
        setReady(false);
        await scanner.stop();
        try {
          const response = await fetch("/api/gate/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: decodedText }) });
          const data = await response.json();
          setResult({ tone: response.ok ? "success" : "danger", message: data.message });
        } catch { setResult({ tone: "danger", message: "Scanner service unavailable." }); }
        window.setTimeout(() => { if (active) { setResult(null); start(); } }, 3000);
      }, () => undefined);
      if (active) setReady(true);
    }
    start().catch(() => setResult({ tone: "danger", message: "Camera permission is required to scan passes." }));
    return () => { active = false; scannerRef.current?.stop().catch(() => undefined); scannerRef.current?.clear(); };
  }, []);

  return <main className={`gate-screen ${result?.tone ?? ""}`}><div className="gate-topbar"><div className="gate-brand"><span className="brand-mark"><Camera size={19} /></span><span>ENTRY CONTROL</span></div><span className="live-pill"><i /> {ready ? "Scanner live" : "Stand by"}</span></div>{result ? <section className="scan-result"><div className="result-icon">{result.tone === "success" ? <CheckCircle2 /> : <ShieldAlert />}</div><p className="result-label">{result.tone === "success" ? "Access cleared" : "Access denied"}</p><h1>{result.message}</h1><p>Returning to scanner in a moment...</p></section> : <section className="scanner-stage"><div className="scanner-heading"><p className="eyebrow">Gate A / Live verification</p><h1>Scan entry pass</h1><p>Point the back camera at the attendee QR code.</p></div><div className="reader-frame"><div id="gate-reader" /><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" /></div><div className="scanner-status"><span className="pulse-dot" /> Waiting for a pass <span className="divider" /> Keep the code inside the frame</div></section>}<p className="gate-footer"><RotateCcw size={14} /> Duplicate scans are blocked automatically</p></main>;
}
