"use client";

import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";

export function ShareCard({ title, path }: { title: string; path: string }) {
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => `${origin}${path}`, [origin, path]);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 font-semibold">{title}</p>
      <div className="grid gap-3 sm:grid-cols-[132px_1fr] sm:items-center">
        <div className="qr-surface flex h-32 w-32 items-center justify-center rounded-md p-2">
          {origin ? <QRCodeSVG value={url} size={112} /> : <div className="h-28 w-28 rounded bg-slate-100" />}
        </div>
        <div className="min-w-0 space-y-2">
          <a className="block break-all text-blue-700 underline" href={path} target="_blank" rel="noreferrer">
            {url || path}
          </a>
          <button className="secondary-button min-h-10" type="button" onClick={copyLink} disabled={!origin}>
            <Copy size={16} /> {copied ? "Скопійовано" : "Копіювати"}
          </button>
        </div>
      </div>
    </div>
  );
}
