"use client";

export function PrintButton() {
  return (
    <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white print:hidden" type="button" onClick={() => window.print()}>
      Print
    </button>
  );
}
