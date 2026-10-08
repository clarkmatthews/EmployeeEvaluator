"use client";

import { useActionState } from "react";
import { saveTalent, type ActionState } from "@/actions/talent";
import { buttonClass, inputClass, labelClass } from "@/components/ui";
import { ggOptionLabel } from "@/lib/gg-ratings";

const performance = ["", "Outstanding", "Exceeds expectations", "Meets expectations", "Needs improvement", "Unsatisfactory"];
const potential = ["", "High", "Medium", "Low"];
const trend = ["", "Improving", "Stable", "Declining"];
const action = ["", "Promote", "Develop in place", "Lateral move", "No change"];
const relocate = ["", "Yes", "No"];

export function TalentForm(props: {
  cycleId: string;
  groupId: string;
  employeeId: string;
  editable: boolean;
  reason: string;
  values: Record<string, string>;
  items: { id: string; itemText: string; helpText: string; rating: number | null }[];
  ratingTexts: string[];
  printHref?: string;
}) {
  const [state, actionState, pending] = useActionState(saveTalent, { error: "" } satisfies ActionState);
  const disabled = !props.editable;
  return (
    <form action={actionState} className="space-y-4">
      <input type="hidden" name="cycleId" value={props.cycleId} />
      <input type="hidden" name="groupId" value={props.groupId} />
      <input type="hidden" name="employeeId" value={props.employeeId} />
      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</p> : null}
      {props.reason ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{props.reason}</p> : null}
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Select name="performance" label="Performance" options={performance} value={props.values.performance} disabled={disabled} />
        <Select name="potential" label="Potential" options={potential} value={props.values.potential} disabled={disabled} />
        <Select name="perfTrend" label="Performance trend" options={trend} value={props.values.perfTrend} disabled={disabled} />
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 font-semibold">Short-term plan</h2>
        <Select name="stpAction" label="Action" options={action} value={props.values.stpAction} disabled={disabled} />
        <Field name="stpWhen" label="When" value={props.values.stpWhen} disabled={disabled} />
        <Field name="stpMove" label="Move" value={props.values.stpMove} disabled={disabled} />
        <Field name="stpBestFit" label="Best fit" value={props.values.stpBestFit} disabled={disabled} />
        <label className="sm:col-span-2"><span className={labelClass}>Explanation</span><textarea className={inputClass} name="stpExplanation" defaultValue={props.values.stpExplanation} rows={3} disabled={disabled} /></label>
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 font-semibold">Long-term plan</h2>
        <Select name="ltpAction" label="Action" options={action} value={props.values.ltpAction} disabled={disabled} />
        <Field name="ltpWhen" label="When" value={props.values.ltpWhen} disabled={disabled} />
        <Field name="ltpMove" label="Move" value={props.values.ltpMove} disabled={disabled} />
        <Field name="ltpBestFit" label="Best fit" value={props.values.ltpBestFit} disabled={disabled} />
        <label className="sm:col-span-2"><span className={labelClass}>Explanation</span><textarea className={inputClass} name="ltpExplanation" defaultValue={props.values.ltpExplanation} rows={3} disabled={disabled} /></label>
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Select name="willingRelocate" label="Willing to relocate" options={relocate} value={props.values.willingRelocate} disabled={disabled} />
        <Field name="geoPref" label="Geographic preference" value={props.values.geoPref} disabled={disabled} />
        <Field name="strength1" label="Strength" value={props.values.strength1} disabled={disabled} />
        <Field name="weakness1" label="Development need" value={props.values.weakness1} disabled={disabled} />
        <Field name="strength2" label="Second strength" value={props.values.strength2} disabled={disabled} />
        <Field name="weakness2" label="Second development need" value={props.values.weakness2} disabled={disabled} />
      </section>
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Growth and Development</h2>
        {props.items.map((item) => (
          <label key={item.id} className="block">
            <span className={labelClass}>{item.itemText}</span>
            {item.helpText ? <span className="mb-1 block text-xs text-slate-500">{item.helpText}</span> : null}
            <select className={inputClass} name={`gg-${item.id}`} defaultValue={item.rating ?? ""} disabled={disabled}>
              <option value="">Select</option>
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>{ggOptionLabel(level, props.ratingTexts)}</option>
              ))}
            </select>
          </label>
        ))}
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label><span className={labelClass}>Comments</span><textarea className={inputClass} name="comments" defaultValue={props.values.comments} rows={3} disabled={disabled} /></label>
        <label><span className={labelClass}>Questions</span><textarea className={inputClass} name="questions" defaultValue={props.values.questions} rows={3} disabled={disabled} /></label>
      </section>
      <div className="flex gap-3">
        <button className={buttonClass} disabled={disabled || pending} type="submit">{pending ? "Saving..." : "Save talent review"}</button>
        {props.printHref ? <a className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm" href={props.printHref}>Print view</a> : null}
      </div>
    </form>
  );
}

function Field({ name, label, value, disabled }: { name: string; label: string; value?: string; disabled: boolean }) {
  return <label><span className={labelClass}>{label}</span><input className={inputClass} name={name} defaultValue={value} disabled={disabled} /></label>;
}

function Select({ name, label, options, value, disabled }: { name: string; label: string; options: string[]; value?: string; disabled: boolean }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <select className={inputClass} name={name} defaultValue={value ?? ""} disabled={disabled}>
        {options.map((option) => <option key={option || "blank"} value={option}>{option || "Select"}</option>)}
      </select>
    </label>
  );
}
