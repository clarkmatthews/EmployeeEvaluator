import { HelpTip } from "@/components/help-tip";

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500";
export const labelClass = "mb-1 block text-sm font-medium text-slate-700";
export const buttonClass =
  "inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60";
export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50";
export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500";

export function Banner({ message, error }: { message?: string; error?: string }) {
  if (error) return <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>;
  if (message) return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>;
  return null;
}

export function PageHeader({ title, detail, help }: { title: string; detail?: string; help?: string }) {
  return (
    <div className="mb-5" style={{ position: "relative", zIndex: 20 }}>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {help ? <HelpTip text={help} /> : null}
      </div>
      {detail ? <p className="mt-1 text-sm text-slate-600">{detail}</p> : null}
    </div>
  );
}

export function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {title ? <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2> : null}
      {children}
    </section>
  );
}
