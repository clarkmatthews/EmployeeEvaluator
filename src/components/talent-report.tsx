import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { ggOptionLabel } from "@/lib/gg-ratings";

export type TalentReportModel = {
  companyName: string;
  year: number;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  jobTitle: string;
  department: string;
  groupName: string;
  reviewerName: string;
  reportDate: string;
  performance: string;
  potential: string;
  trend: string;
  shortTerm: Plan;
  longTerm: Plan;
  willingRelocate: string;
  geoPref: string;
  strength1: string;
  strength2: string;
  weakness1: string;
  weakness2: string;
  comments: string;
  questions: string;
  goodToGreat: { id: string; item: string; rating: string }[];
  ranks: { userId: string; name: string; performance: number | null; potential: number | null }[];
};

type Plan = {
  action: string;
  when: string;
  move: string;
  bestFit: string;
  explanation: string;
};

export function TalentReport({ report }: { report: TalentReportModel }) {
  return (
    <article className="pa-report">
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          <Link className="text-indigo-700 hover:underline" href="/reports">Reports</Link>
          {" · "}
          <Link className="text-indigo-700 hover:underline" href="/talent">Talent reviews</Link>
        </p>
        <PrintButton />
      </div>

      <header className="border-b-2 border-slate-900 pb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-600">{report.companyName}</p>
        <h1 className="text-xl font-bold tracking-tight">{report.year} Talent review</h1>
        <p className="text-sm">{report.employeeName}</p>
      </header>

      <Section title="Employee">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <Field label="Employee" value={report.employeeName} />
          <Field label="Reviewer" value={show(report.reviewerName)} />
          <Field label="Group" value={report.groupName} />
          <Field label="Job title" value={show(report.jobTitle)} />
          <Field label="Department" value={show(report.department)} />
          <Field label="Employee number" value={show(report.employeeNumber)} />
          <Field label="Report date" value={report.reportDate} />
        </dl>
      </Section>

      <Section title="Summary">
        <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
          <Field label="Performance" value={show(report.performance)} />
          <Field label="Potential" value={show(report.potential)} />
          <Field label="Trend" value={show(report.trend)} />
        </dl>
      </Section>

      <PlanSection title="Short-term plan" plan={report.shortTerm} />
      <PlanSection title="Long-term plan" plan={report.longTerm} />

      <Section title="Relocation and development">
        <dl className="grid grid-cols-2 gap-x-6">
          <Field label="Willing to relocate" value={show(report.willingRelocate)} />
          <Field label="Geographic preference" value={show(report.geoPref)} />
          <Field label="Strength" value={show(report.strength1)} />
          <Field label="Development need" value={show(report.weakness1)} />
          <Field label="Second strength" value={show(report.strength2)} />
          <Field label="Second development need" value={show(report.weakness2)} />
        </dl>
      </Section>

      <Section title="Growth and Development">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {report.goodToGreat.length === 0 ? (
              <tr>
                <td colSpan={2}>—</td>
              </tr>
            ) : report.goodToGreat.map((row) => (
              <tr key={row.id}>
                <td>{row.item}</td>
                <td>{row.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Comments">
        <Note label="Comments" body={report.comments} />
        <Note label="Questions" body={report.questions} />
      </Section>

      <section className="pa-section" style={{ breakInside: "auto" }}>
        <h2>Group ranks</h2>
        <p className="mb-2 text-slate-600">{report.groupName}. Sorted by performance rank.</p>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Performance</th>
              <th>Potential</th>
            </tr>
          </thead>
          <tbody>
            {report.ranks.length === 0 ? (
              <tr>
                <td colSpan={3}>—</td>
              </tr>
            ) : report.ranks.map((rank) => (
              <tr key={rank.userId} className={rank.userId === report.employeeId ? "subject" : undefined}>
                <td>
                  {rank.name}
                  {rank.userId === report.employeeId ? <span className="ml-2 font-normal text-slate-600">This review</span> : null}
                </td>
                <td className="num">{rankNumber(rank.performance)}</td>
                <td className="num">{rankNumber(rank.potential)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function PlanSection({ title, plan }: { title: string; plan: Plan }) {
  return (
    <Section title={title}>
      <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
        <Field label="Action" value={show(plan.action)} />
        <Field label="When" value={show(plan.when)} />
        <Field label="Move" value={show(plan.move)} />
        <Field label="Best fit" value={show(plan.bestFit)} />
      </dl>
      <div className="mt-1">
        <Field label="Explanation" value={show(plan.explanation)} />
      </div>
    </Section>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 py-1">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function Note({ label, body }: { label: string; body: string }) {
  return (
    <div className="mb-3">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 min-h-8 whitespace-pre-wrap border border-slate-400 p-2">{show(body)}</p>
    </div>
  );
}

function show(value: string) {
  const text = value.trim();
  return text || "—";
}

function rankNumber(value: number | null) {
  return value == null ? "—" : String(value);
}

export function talentRatingText(rating: number | null | undefined, texts: readonly string[]) {
  if (rating == null || rating <= 0) return "—";
  return ggOptionLabel(rating, texts);
}
