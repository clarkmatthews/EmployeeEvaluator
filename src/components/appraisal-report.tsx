import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { fillYear, lineTotals, ratingMark, type RatedLine } from "@/lib/appraisal-report";
import { RATING_LABEL } from "@/lib/scoring";

export type AppraisalReportModel = {
  year: number;
  companyName: string;
  employeeName: string;
  reviewerName: string;
  groupName: string;
  jobTitle: string;
  department: string;
  employeeNumber: string;
  reportDate: string;
  showSelf: boolean;
  eeMin: number;
  meMin: number;
  otherJobsNote: string;
  mgrDutyPct: number | null;
  goals: { goal: string; completionDate: string }[];
  comments: { super1: string; super2: string; super3: string; emp: string };
  signatures: { emp: string; sup: string; approver: string };
  keys: RatedLine[];
  scorecards: RatedLine[];
  accountabilities: RatedLine[];
  behaviors: RatedLine[];
  template: {
    inclEmplInfo: boolean;
    inclOthrJobs: boolean;
    inclRankDesc: boolean;
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
    formRatingsDescTitle: string;
    formRatingsDesc: string;
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
    signatureCompleterSupTitle: string;
    signatureApproverTitle: string;
    signatureEmployeeTitle: string;
  };
};

export function AppraisalReport({ report }: { report: AppraisalReportModel }) {
  const template = report.template;
  const sections = scoredSections(report);
  const overall = sections.reduce(
    (totals, section) => ({
      emp: totals.emp + section.emp,
      sup: totals.sup + section.sup,
      max: totals.max + section.max,
    }),
    { emp: 0, sup: 0, max: 0 },
  );
  const supervisorRating = ratingMark(overall.sup, report.eeMin, report.meMin);
  const employeeHasRatings = sections.some((section) => section.empRated);
  const employeeRating = employeeHasRatings ? ratingMark(overall.emp, report.eeMin, report.meMin) : null;
  let number = 0;
  const heading = (title: string) => {
    number += 1;
    return `Section ${number}: ${fillYear(title, report.year)}`;
  };

  return (
    <article className="pa-report">
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          <Link className="text-indigo-700 hover:underline" href="/reports">Reports</Link>
          {" · "}
          <Link className="text-indigo-700 hover:underline" href="/appraisals">Appraisals</Link>
        </p>
        <PrintButton />
      </div>

      <header className="border-b-2 border-slate-900 pb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-600">{report.companyName}</p>
        <h1 className="text-xl font-bold tracking-tight">{report.year} Performance appraisal</h1>
        <p className="text-sm">{report.employeeName}</p>
      </header>

      {template.inclEmplInfo ? (
        <Section title="Employee">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            <Field label="Employee" value={report.employeeName} />
            <Field label="Reviewer" value={report.reviewerName || "—"} />
            <Field label="Group" value={report.groupName} />
            <Field label="Job title" value={report.jobTitle || "—"} />
            <Field label="Department" value={report.department || "—"} />
            <Field label="Employee number" value={report.employeeNumber || "—"} />
            <Field label="Report date" value={report.reportDate} />
          </dl>
        </Section>
      ) : null}

      {template.inclOthrJobs ? (
        <Section title="Other jobs this cycle">
          <p className="whitespace-pre-wrap">{report.otherJobsNote || "—"}</p>
        </Section>
      ) : null}

      {template.inclRankDesc ? <Copy title={fillYear(template.formRatingsDescTitle, report.year)} body={fillYear(template.formRatingsDesc, report.year)} /> : null}
      {template.inclInstruct ? <Copy title={fillYear(template.formInstructTitle, report.year)} body={fillYear(template.formInstruct, report.year)} /> : null}

      {template.inclKeysSect ? (
        <RatedSection heading={heading(template.keysSectTitle)} instruct={fillYear(template.keysSectInstruct, report.year)} lines={report.keys} showSelf={report.showSelf} />
      ) : null}
      {template.inclScorecardSect ? (
        <RatedSection heading={heading(template.scorecardSectTitle)} instruct={fillYear(template.scorecardSectInstruct, report.year)} lines={report.scorecards} showSelf={report.showSelf} />
      ) : null}
      {template.inclAcctSect ? (
        <RatedSection heading={heading(template.acctSectTitle)} instruct={fillYear(template.acctSectInstruct, report.year)} lines={report.accountabilities} showSelf={report.showSelf} />
      ) : null}
      {template.inclG2GSect ? (
        <RatedSection
          heading={heading(template.g2gBehaveSectTitle)}
          instruct={fillYear(template.g2gBehaveSectInstruct, report.year)}
          legend={fillYear(template.g2gBehaveSectLegend, report.year)}
          lines={report.behaviors}
          showSelf={report.showSelf}
        />
      ) : null}

      {template.inclMgrDutysSect ? (
        <Section title={heading(template.mgrDutysSectTitle)}>
          {template.mgrDutysSectText ? <p className="mb-2 whitespace-pre-wrap">{fillYear(template.mgrDutysSectText, report.year)}</p> : null}
          <p>
            During {report.year}, I spent <strong>{report.mgrDutyPct ?? "—"}%</strong> of my time engaged in managerial duties.
          </p>
        </Section>
      ) : null}

      {template.inclRatingsSummSect || template.inclPerfSummSect ? (
        <Section title={heading(template.perfSummSectTitle)}>
          <table>
            <thead>
              <tr>
                <th>Section</th>
                {report.showSelf ? <th>Employee points</th> : null}
                <th>Supervisor points</th>
                <th>Points possible</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.title}>
                  <td>{section.title}</td>
                  {report.showSelf ? <td className="num">{section.emp}</td> : null}
                  <td className="num">{section.sup}</td>
                  <td className="num">{section.max}</td>
                </tr>
              ))}
              <tr>
                <th>Overall</th>
                {report.showSelf ? <td className="num">{overall.emp}</td> : null}
                <td className="num">{overall.sup}</td>
                <td className="num">{overall.max}</td>
              </tr>
            </tbody>
          </table>
          <table className="mt-3">
            <thead>
              <tr>
                <th>Overall performance</th>
                <th>Range</th>
                {report.showSelf ? <th>Employee</th> : null}
                <th>Supervisor</th>
              </tr>
            </thead>
            <tbody>
              <RatingRow code="ee" label={RATING_LABEL.ee} range={`${report.eeMin} – ${overall.max}`} marked={supervisorRating} employeeMarked={employeeRating} showSelf={report.showSelf} />
              <RatingRow code="me" label={RATING_LABEL.me} range={`${report.meMin} – ${Math.max(report.eeMin - 1, report.meMin)}`} marked={supervisorRating} employeeMarked={employeeRating} showSelf={report.showSelf} />
              <RatingRow code="ni" label={RATING_LABEL.ni} range={`0 – ${Math.max(report.meMin - 1, 0)}`} marked={supervisorRating} employeeMarked={employeeRating} showSelf={report.showSelf} />
            </tbody>
          </table>
        </Section>
      ) : null}

      {template.inclG2GGoalsSect ? (
        <Section title={heading(template.g2gGoalsSectTitle)}>
          {template.g2gGoalsSectInstruct ? <p className="mb-2 whitespace-pre-wrap text-slate-700">{fillYear(template.g2gGoalsSectInstruct, report.year)}</p> : null}
          <table>
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Goal / project</th>
                <th>Targeted completion date</th>
              </tr>
            </thead>
            <tbody>
              {(report.goals.length ? report.goals : [{ goal: "", completionDate: "" }]).map((goal, index) => (
                <tr key={`${goal.goal}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{goal.goal || "—"}</td>
                  <td>{goal.completionDate || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {template.inclSuper1CmtSect || template.inclSuper2CmtSect || template.inclSuper3CmtSect ? (
        <Section title="Comments">
          {template.inclSuper1CmtSect ? <Comment label={template.superCmt1Title} body={report.comments.super1} /> : null}
          {template.inclSuper2CmtSect ? <Comment label={template.superCmt2Title} body={report.comments.super2} /> : null}
          {template.inclSuper3CmtSect ? <Comment label={template.superCmt3Title} body={report.comments.super3} /> : null}
          <Comment label="Employee comments" body={report.comments.emp} />
        </Section>
      ) : (
        <Section title="Employee comments">
          <p className="whitespace-pre-wrap">{report.comments.emp || "—"}</p>
        </Section>
      )}

      {template.inclApprSigsSect ? (
        <Section title="Signatures">
          <p className="mb-3 text-slate-700">Your signature acknowledges that you have read and discussed the evaluation and understand its contents.</p>
          <SignatureRow
            items={[
              { label: `${template.signatureEmployeeTitle} signature`, name: report.signatures.emp },
              { label: `${template.signatureCompleterSupTitle} signature`, name: report.signatures.sup },
              { label: `${template.signatureApproverTitle} signature`, name: report.signatures.approver },
            ]}
          />
        </Section>
      ) : null}
    </article>
  );
}

function scoredSections(report: AppraisalReportModel) {
  const template = report.template;
  const sections: { title: string; emp: number; sup: number; max: number; empRated: boolean }[] = [];
  const push = (title: string, lines: RatedLine[]) => {
    sections.push({
      title: fillYear(title, report.year),
      ...lineTotals(lines),
      empRated: lines.some((line) => line.empLevel != null),
    });
  };
  if (template.inclKeysSect) push(template.keysSectTitle, report.keys);
  if (template.inclScorecardSect) push(template.scorecardSectTitle, report.scorecards);
  if (template.inclAcctSect) push(template.acctSectTitle, report.accountabilities);
  if (template.inclG2GSect) push(template.g2gBehaveSectTitle, report.behaviors);
  return sections;
}

function RatedSection({
  heading,
  instruct,
  legend,
  lines,
  showSelf,
}: {
  heading: string;
  instruct: string;
  legend?: string;
  lines: RatedLine[];
  showSelf: boolean;
}) {
  const totals = lineTotals(lines);
  return (
    <Section title={heading}>
      {instruct ? <p className="mb-2 whitespace-pre-wrap text-slate-700">{instruct}</p> : null}
      {legend ? <p className="mb-2 whitespace-pre-wrap text-slate-600">{legend}</p> : null}
      {lines.length === 0 ? <p>—</p> : lines.map((line, index) => <RatedItem key={line.id} index={index + 1} line={line} showSelf={showSelf} />)}
      <p className="mt-2 text-right font-semibold">
        {showSelf ? <span className="mr-4">Employee {totals.emp}</span> : null}
        Supervisor {totals.sup}
        <span className="ml-4 font-normal text-slate-600">of {totals.max}</span>
      </p>
    </Section>
  );
}

function RatedItem({ index, line, showSelf }: { index: number; line: RatedLine; showSelf: boolean }) {
  const levels = line.levels.filter((level) => level.included);
  return (
    <div className="pa-item">
      <p className="font-semibold">{index}. {line.name}</p>
      {line.text && line.text !== line.name ? <p className="mt-1 whitespace-pre-wrap">{line.text}</p> : null}
      {line.metrics.length ? (
        <p className="mt-1 text-slate-700">{line.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(" · ")}</p>
      ) : null}
      <table className="mt-2">
        <thead>
          <tr>
            <th />
            {levels.map((level) => (
              <th key={level.level}>
                {level.label || `Level ${level.level}`}
                <span className="block font-normal">{level.score} pts</span>
              </th>
            ))}
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {showSelf ? (
            <tr>
              <th>Employee</th>
              {levels.map((level) => <td key={level.level} className="mark">{line.empLevel === level.level ? "X" : ""}</td>)}
              <td className="num">{line.empPoints}</td>
            </tr>
          ) : null}
          <tr>
            <th>Supervisor</th>
            {levels.map((level) => <td key={level.level} className="mark">{line.supLevel === level.level ? "X" : ""}</td>)}
            <td className="num">{line.supPoints}</td>
          </tr>
        </tbody>
      </table>
      {line.supComment ? <p className="mt-1"><span className="font-semibold">Supervisor comments: </span>{line.supComment}</p> : null}
      {showSelf && line.empComment ? <p className="mt-1"><span className="font-semibold">Employee comments: </span>{line.empComment}</p> : null}
    </div>
  );
}

function RatingRow({
  code,
  label,
  range,
  marked,
  employeeMarked,
  showSelf,
}: {
  code: "ee" | "me" | "ni";
  label: string;
  range: string;
  marked: "ee" | "me" | "ni";
  employeeMarked: "ee" | "me" | "ni" | null;
  showSelf: boolean;
}) {
  return (
    <tr>
      <td>{label}</td>
      <td>{range}</td>
      {showSelf ? <td className="mark">{employeeMarked === code ? "X" : ""}</td> : null}
      <td className="mark">{marked === code ? "X" : ""}</td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pa-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Copy({ title, body }: { title: string; body: string }) {
  if (!title && !body) return null;
  return (
    <Section title={title || "Notes"}>
      <p className="whitespace-pre-wrap">{body}</p>
    </Section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 py-1">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Comment({ label, body }: { label: string; body: string }) {
  return (
    <div className="mb-3">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 min-h-8 whitespace-pre-wrap border border-slate-400 p-2">{body || "—"}</p>
    </div>
  );
}

function SignatureRow({ items }: { items: { label: string; name: string }[] }) {
  const lineStyle = { borderBottom: "1px solid #0f172a", minHeight: "1.75rem" };
  return (
    <div className="grid gap-x-4 sm:grid-cols-3">
      {items.map((item) => (
        <p key={`${item.label}-label`} className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
      ))}
      {items.map((item) => (
        <p key={`${item.label}-name`} className="mt-6 pb-1 font-semibold" style={lineStyle}>{item.name || "\u00a0"}</p>
      ))}
      {items.map((item) => (
        <p key={`${item.label}-date`} className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Date</p>
      ))}
      {items.map((item) => (
        <p key={`${item.label}-dateline`} className="mt-6" style={lineStyle}>{"\u00a0"}</p>
      ))}
    </div>
  );
}
