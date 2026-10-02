"use client";

import { useEffect, useId, useRef, useState } from "react";

export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Page help"
        className="inline-flex items-center justify-center border border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
        style={{ width: "1.5rem", height: "1.5rem", borderRadius: "9999px" }}
        onClick={() => setOpen((current) => !current)}
      >
        ?
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Page help"
          className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg"
          style={{ position: "absolute", zIndex: 40, top: "100%", left: 0, width: "22rem", marginTop: 8 }}
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      ) : null}
    </div>
  );
}
