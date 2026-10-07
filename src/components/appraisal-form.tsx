"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useActionState } from "react";
import { saveAppraisal, type ActionState } from "@/actions/appraisals";
import { buttonClass, inputClass, labelClass } from "@/components/ui";
import { levelsOf, overallRating, pointsFor, RATING_LABEL, scoreKeyLevel, scoreRatioLevel, type LevelSource } from "@/lib/scoring";

type Rated = LevelSource & { id: string; name: string };

type KeyRow = Rated & {
  target: number | null;
  achieved: number | null;
  empLevel: number | null;
  supLevel: number | null;
  empComment: string;
  supComment: string;
};

type ScorecardRow = Rated & {
  count: number | null;
  dollars: number | null;
  empLevel: number | null;
  supLevel: number | null;
  empComment: string;
  supComment: string;
};

type TextRow = Rated & {
  text: string;
  empLevel: number | null;
  supLevel: number | null;
  empComment: string;
  supComment: string;
};

type BehaviorRow = Rated & {
  empLevel: number | null;
  supLevel: number | null;
  empComment: string;
  supComment: string;
};

type Goal = { goal: string; completionDate: string };

export function AppraisalForm(props: {
  cycleId: string;
  groupId: string;
  employeeId: string;
  editable: boolean;
  reason: string;
  asEmployee: boolean;
  asSupervisor: boolean;
  showEmployeeColumn: boolean;
  eeMin: number;
  meMin: number;
  template: {
    inclEmplInfo: boolean;
    inclOthrJobs: boolean;
    inclInstruct: boolean;
    inclKeysSect: boolean;
    inclScorecardSect: boolean;
    inclAcctSect: boolean;
    inclG2GSect: boolean;
    inclPerfSummSect: boolean;
    inclSuper1CmtSect: boolean;
    inclSuper2CmtSect: boolean;
    inclSuper3CmtSect: boolean;
    inclMgrDutysSect: boolean;
    inclRatingsSummSect: boolean;
    inclG2GGoalsSect: boolean;
    inclApprSigsSect: boolean;
    formInstructTitle: string;
    formInstruct: string;
    keysSectTitle: string;
    keysSectInstruct: string;
    scorecardSectTitle: string;
    scorecardSectInstruct: string;
    acctSectTitle: string;
    acctSectInstruct: string;
    g2gBehaveSectTitle: string;
    g2gBehaveSectInstruct: string;
    g2gBehaveSectLegend: string;
    perfSummSectTitle: string;
    superCmt1Title: string;
    superCmt2Title: string;
    superCmt3Title: string;
    mgrDutysSectTitle: string;
    mgrDutysSectText: string;
    g2gGoalsSectTitle: string;
    g2gGoalsSectInstruct: string;
    signatureCompleterEmpTitle: string;
    signatureCompleterSupTitle: string;
    signatureApproverTitle: string;
    signatureEmployeeTitle: string;
  };
  employeeInfo: { name: string; jobTitle: string; department: string; employeeNumber: string };
  keys: KeyRow[];
  scorecards: ScorecardRow[];
  accountabilities: TextRow[];
  behaviors: BehaviorRow[];
  goals: Goal[];
  comments: { emp: string; super1: string; super2: string; super3: string };
  mgrDutyPct: number | null;
  otherJobsNote: string;
  signatures: { emp: string; sup: string; approver: string };
  printHref?: string;
}) {
  const [state, action, pending] = useActionState(saveAppraisal, { error: "" } satisfies ActionState);
  const [keys, setKeys] = useState(props.keys);
  const [scorecards, setScorecards] = useState(props.scorecards);
  const [accountabilities, setAccountabilities] = useState(props.accountabilities);
  const [behaviors, setBehaviors] = useState(props.behaviors);
  const [goals, setGoals] = useState(props.goals.length ? props.goals : [{ goal: "", completionDate: "" }]);
  const disabled = !props.editable;

  const totals = useMemo(() => {
    const emp =
      sum(keys, "empLevel") + sum(scorecards, "empLevel") + sum(accountabilities, "empLevel") + sum(behaviors, "empLevel");
    const sup =
      sum(keys, "supLevel") + sum(scorecards, "supLevel") + sum(accountabilities, "supLevel") + sum(behaviors, "supLevel");
    return { emp, sup };
  }, [keys, scorecards, accountabilities, behaviors]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cycleId" value={props.cycleId} />
      <input type="hidden" name="groupId" value={props.groupId} />
      <input type="hidden" name="employeeId" value={props.employeeId} />
      <input type="hidden" name="goalCount" value={goals.length} />
      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</p> : null}
      {props.reason ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{props.reason}</p> : null}
      {props.template.inclEmplInfo ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Employee</h2>
          <p className="mt-1 text-sm">{props.employeeInfo.name} · {props.employeeInfo.jobTitle || "No title"} · {props.employeeInfo.department || "No department"} · {props.employeeInfo.employeeNumber || "No number"}</p>
        </section>
      ) : null}
      {props.template.inclOthrJobs ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <label><span className={labelClass}>Other jobs this cycle</span><textarea className={inputClass} name="otherJobsNote" defaultValue={props.otherJobsNote} rows={3} disabled={disabled} /></label>
        </section>
      ) : <input type="hidden" name="otherJobsNote" value={props.otherJobsNote} />}
      {props.template.inclInstruct ? <Copy title={props.template.formInstructTitle} body={props.template.formInstruct} /> : null}
      {props.template.inclKeysSect ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{props.template.keysSectTitle}</h2>
          <p className="text-sm text-slate-600">{props.template.keysSectInstruct}</p>
          {keys.map((row) => {
            const variance = row.target && row.achieved != null ? ((100 * row.achieved) / row.target - 100) : null;
            return (
              <div key={row.id} className="rounded-md border border-slate-100 p-3">
                <p className="font-medium">{row.name}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label><span className={labelClass}>Target</span><input className={inputClass} name={`key-target-${row.id}`} type="number" step="0.01" value={row.target ?? ""} disabled={disabled} onChange={(event) => updateKey(row.id, "target", event.target.value)} /></label>
                  <label><span className={labelClass}>Achieved</span><input className={inputClass} name={`key-achieved-${row.id}`} type="number" step="0.01" value={row.achieved ?? ""} disabled={disabled} onChange={(event) => updateKey(row.id, "achieved", event.target.value)} /></label>
                </div>
                {variance != null ? <p className="mt-1 text-xs text-slate-500">{variance.toFixed(1)}% versus target</p> : null}
                <Radios namePrefix="key" row={row} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} onEmp={(level) => patch(setKeys, row.id, { empLevel: level })} onSup={(level) => patch(setKeys, row.id, { supLevel: level })} />
                <Comments prefix="key" id={row.id} emp={row.empComment} sup={row.supComment} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} />
              </div>
            );
          })}
        </section>
      ) : null}
      {props.template.inclScorecardSect ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{props.template.scorecardSectTitle}</h2>
          <p className="text-sm text-slate-600">{props.template.scorecardSectInstruct}</p>
          {scorecards.map((row) => {
            const ratio = row.count ? (row.dollars ?? 0) / row.count : null;
            return (
              <div key={row.id} className="rounded-md border border-slate-100 p-3">
                <p className="font-medium">{row.name}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label><span className={labelClass}>Count</span><input className={inputClass} name={`sc-count-${row.id}`} type="number" step="0.01" value={row.count ?? ""} disabled={disabled} onChange={(event) => updateScorecard(row.id, "count", event.target.value)} /></label>
                  <label><span className={labelClass}>Dollars</span><input className={inputClass} name={`sc-dollars-${row.id}`} type="number" step="0.01" value={row.dollars ?? ""} disabled={disabled} onChange={(event) => updateScorecard(row.id, "dollars", event.target.value)} /></label>
                </div>
                {ratio != null ? <p className="mt-1 text-xs text-slate-500">Ratio {ratio.toFixed(2)}</p> : null}
                <Radios namePrefix="sc" row={row} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} onEmp={(level) => patch(setScorecards, row.id, { empLevel: level })} onSup={(level) => patch(setScorecards, row.id, { supLevel: level })} />
                <Comments prefix="sc" id={row.id} emp={row.empComment} sup={row.supComment} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} />
              </div>
            );
          })}
        </section>
      ) : null}
      {props.template.inclAcctSect ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{props.template.acctSectTitle}</h2>
          <p className="text-sm text-slate-600">{props.template.acctSectInstruct}</p>
          {accountabilities.map((row) => (
            <div key={row.id} className="rounded-md border border-slate-100 p-3">
              <label><span className={labelClass}>{row.name}</span><textarea className={inputClass} name={`ac-text-${row.id}`} defaultValue={row.text} rows={2} disabled={disabled} /></label>
              <Radios namePrefix="ac" row={row} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} onEmp={(level) => patch(setAccountabilities, row.id, { empLevel: level })} onSup={(level) => patch(setAccountabilities, row.id, { supLevel: level })} />
              <Comments prefix="ac" id={row.id} emp={row.empComment} sup={row.supComment} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} />
            </div>
          ))}
        </section>
      ) : null}
      {props.template.inclG2GSect ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{props.template.g2gBehaveSectTitle}</h2>
          <p className="text-sm text-slate-600">{props.template.g2gBehaveSectInstruct}</p>
          {props.template.g2gBehaveSectLegend ? <p className="text-xs text-slate-500">{props.template.g2gBehaveSectLegend}</p> : null}
          {behaviors.map((row) => (
            <div key={row.id} className="rounded-md border border-slate-100 p-3">
              <p className="font-medium">{row.name}</p>
              <Radios namePrefix="bh" row={row} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} onEmp={(level) => patch(setBehaviors, row.id, { empLevel: level })} onSup={(level) => patch(setBehaviors, row.id, { supLevel: level })} />
              <Comments prefix="bh" id={row.id} emp={row.empComment} sup={row.supComment} showEmployee={props.showEmployeeColumn} asEmployee={props.asEmployee} asSupervisor={props.asSupervisor} disabled={disabled} />
            </div>
          ))}
        </section>
      ) : null}
      {props.template.inclMgrDutysSect ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{props.template.mgrDutysSectTitle}</h2>
          <p className="text-sm text-slate-600">{props.template.mgrDutysSectText}</p>
          <label className="mt-2 block max-w-xs"><span className={labelClass}>Percent of time</span><input className={inputClass} name="mgrDutyPct" type="number" step="0.01" defaultValue={props.mgrDutyPct ?? ""} disabled={disabled} /></label>
        </section>
      ) : null}
      {props.template.inclRatingsSummSect || props.template.inclPerfSummSect ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{props.template.perfSummSectTitle}</h2>
          <p className="mt-2 text-sm">Employee points {totals.emp} · {RATING_LABEL[overallRating(totals.emp, props.eeMin, props.meMin)]}</p>
          <p className="text-sm">Supervisor points {totals.sup} · {RATING_LABEL[overallRating(totals.sup, props.eeMin, props.meMin)]}</p>
          <p className="mt-1 text-xs text-slate-500">Exceeds at {props.eeMin} points. Meets at {props.meMin} points.</p>
        </section>
      ) : null}
      {props.template.inclG2GGoalsSect ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{props.template.g2gGoalsSectTitle}</h2>
          <p className="text-sm text-slate-600">{props.template.g2gGoalsSectInstruct}</p>
          {goals.map((goal, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_180px]">
              <input className={inputClass} name={`goal-${index}`} defaultValue={goal.goal} placeholder="Goal" disabled={disabled} />
              <input className={inputClass} name={`goalDate-${index}`} type="date" defaultValue={goal.completionDate} disabled={disabled} />
            </div>
          ))}
          {!disabled ? <button className="text-sm text-indigo-700" type="button" onClick={() => setGoals((current) => [...current, { goal: "", completionDate: "" }])}>Add goal</button> : null}
        </section>
      ) : null}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        {props.template.inclSuper1CmtSect ? <label><span className={labelClass}>{props.template.superCmt1Title}</span><textarea className={inputClass} name="superComment1" defaultValue={props.comments.super1} rows={3} disabled={disabled || !props.asSupervisor} /></label> : null}
        {props.template.inclSuper2CmtSect ? <label><span className={labelClass}>{props.template.superCmt2Title}</span><textarea className={inputClass} name="superComment2" defaultValue={props.comments.super2} rows={3} disabled={disabled || !props.asSupervisor} /></label> : null}
        {props.template.inclSuper3CmtSect ? <label><span className={labelClass}>{props.template.superCmt3Title}</span><textarea className={inputClass} name="superComment3" defaultValue={props.comments.super3} rows={3} disabled={disabled || !props.asSupervisor} /></label> : null}
        <label><span className={labelClass}>Employee comments</span><textarea className={inputClass} name="empComment" defaultValue={props.comments.emp} rows={3} disabled={disabled || !props.asEmployee} /></label>
      </section>
      {props.template.inclApprSigsSect ? (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <label><span className={labelClass}>{props.template.signatureEmployeeTitle}</span><input className={inputClass} name="empSignature" defaultValue={props.signatures.emp} disabled={disabled || !props.asEmployee} /></label>
          <label><span className={labelClass}>{props.template.signatureCompleterSupTitle}</span><input className={inputClass} name="supSignature" defaultValue={props.signatures.sup} disabled={disabled || !props.asSupervisor} /></label>
          <label><span className={labelClass}>{props.template.signatureApproverTitle}</span><input className={inputClass} name="approverSignature" defaultValue={props.signatures.approver} disabled={disabled || !props.asSupervisor} /></label>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button className={buttonClass} type="submit" disabled={disabled || pending}>{pending ? "Saving..." : "Save appraisal"}</button>
        {props.printHref ? <a className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm" href={props.printHref}>Print view</a> : null}
      </div>
    </form>
  );

  function updateKey(id: string, field: "target" | "achieved", raw: string) {
    setKeys((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: raw === "" ? null : Number(raw) };
      const suggested = scoreKeyLevel(next, next.target, next.achieved);
      if (suggested && props.asEmployee) next.empLevel = suggested;
      if (suggested && props.asSupervisor) next.supLevel = suggested;
      return next;
    }));
  }

  function updateScorecard(id: string, field: "count" | "dollars", raw: string) {
    setScorecards((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: raw === "" ? null : Number(raw) };
      const suggested = scoreRatioLevel(next, next.count, next.dollars);
      if (suggested && props.asEmployee) next.empLevel = suggested;
      if (suggested && props.asSupervisor) next.supLevel = suggested;
      return next;
    }));
  }
}

function sum(rows: (LevelSource & { empLevel: number | null; supLevel: number | null })[], field: "empLevel" | "supLevel") {
  return rows.reduce((total, row) => total + pointsFor(levelsOf(row), row[field]), 0);
}

function patch<T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>, id: string, change: Partial<T>) {
  setter((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
}

function Copy({ title, body }: { title: string; body: string }) {
  if (!title && !body) return null;
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">{title}</h2><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{body}</p></section>;
}

function Radios({
  namePrefix,
  row,
  showEmployee,
  asEmployee,
  asSupervisor,
  disabled,
  onEmp,
  onSup,
}: {
  namePrefix: string;
  row: LevelSource & { id: string; empLevel: number | null; supLevel: number | null };
  showEmployee: boolean;
  asEmployee: boolean;
  asSupervisor: boolean;
  disabled: boolean;
  onEmp: (level: number) => void;
  onSup: (level: number) => void;
}) {
  const levels = levelsOf(row).filter((level) => level.included);
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {showEmployee ? (
        <fieldset>
          <legend className="text-xs font-medium uppercase text-slate-500">Employee</legend>
          {levels.map((level) => (
            <label key={level.level} className="mt-1 flex items-center gap-2 text-sm">
              <input type="radio" name={`${namePrefix}-emp-${row.id}`} value={level.level} checked={row.empLevel === level.level} disabled={disabled || !asEmployee} onChange={() => onEmp(level.level)} />
              {level.label} ({level.score})
            </label>
          ))}
        </fieldset>
      ) : null}
      <fieldset>
        <legend className="text-xs font-medium uppercase text-slate-500">Supervisor</legend>
        {levels.map((level) => (
          <label key={level.level} className="mt-1 flex items-center gap-2 text-sm">
            <input type="radio" name={`${namePrefix}-sup-${row.id}`} value={level.level} checked={row.supLevel === level.level} disabled={disabled || !asSupervisor} onChange={() => onSup(level.level)} />
            {level.label} ({level.score})
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function Comments({
  prefix,
  id,
  emp,
  sup,
  showEmployee,
  asEmployee,
  asSupervisor,
  disabled,
}: {
  prefix: string;
  id: string;
  emp: string;
  sup: string;
  showEmployee: boolean;
  asEmployee: boolean;
  asSupervisor: boolean;
  disabled: boolean;
}) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {showEmployee ? <input className={inputClass} name={`${prefix}-empComment-${id}`} defaultValue={emp} placeholder="Employee comment" disabled={disabled || !asEmployee} /> : null}
      <input className={inputClass} name={`${prefix}-supComment-${id}`} defaultValue={sup} placeholder="Supervisor comment" disabled={disabled || !asSupervisor} />
    </div>
  );
}
