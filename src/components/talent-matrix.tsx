import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { MATRIX_VIEWS, type MatrixSection, type MatrixView } from "@/lib/talent-matrix";

export function TalentMatrixReport({
  companyName,
  year,
  rootName,
  view,
  sections,
}: {
  companyName: string;
  year: number;
  rootName: string;
  view: MatrixView;
  sections: MatrixSection[];
}) {
  const choice = MATRIX_VIEWS.find((item) => item.id === view);
  return (
    <article className="talent-matrix space-y-8 text-sm">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <Link className="text-indigo-700 hover:underline" href="/reports">Reports</Link>
        <PrintButton />
      </div>
      <header className="border-b-2 border-slate-900 pb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-600">{companyName}</p>
        <h1 className="text-xl font-bold">{year} Talent review · {rootName}</h1>
        <p className="mt-1 font-semibold">{choice?.label}</p>
        <p className="mt-1 text-slate-700">{choice?.description}</p>
        <p className="mt-2 text-xs text-slate-600">
          Performance increases up the grid. Potential increases to the right. Outstanding and Exceeds expectations are High. Meets expectations is Acceptable. Needs improvement and Unsatisfactory are Poor. Medium potential is Uncertain.
        </p>
      </header>
      {sections.length === 0 ? <p>No talent reviews have been saved in this branch.</p> : sections.map((section) => <MatrixSectionView key={section.id} section={section} />)}
    </article>
  );
}

function MatrixSectionView({ section }: { section: MatrixSection }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h2 className="text-base font-bold uppercase tracking-wide">{section.title}</h2>
      <div className="flex items-stretch gap-3">
        <div className="flex w-8 shrink-0 items-center justify-center">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest text-slate-700"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Performance
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {section.boxes.map((box) => (
              <div key={box.title} className="min-h-36 border border-slate-400 p-2">
                <p className="text-xs font-semibold">{box.title}</p>
                <p className="mt-1 text-[11px] italic text-slate-600">{box.caption}</p>
                <ul className="mt-2 space-y-1">
                  {box.people.map((person) => (
                    <li key={person.evaluationId}>
                      <Link className="text-indigo-800 hover:underline" href={`/print/talent/${person.evaluationId}`}>{person.name}</Link>
                      {section.showGroup ? <span className="text-slate-500"> · {person.groupName}</span> : null}
                    </li>
                  ))}
                  {box.people.length === 0 ? <li className="text-slate-400">—</li> : null}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide">Potential →</p>
        </div>
      </div>
      {section.unplaced.length ? (
        <div>
          <h3 className="font-semibold">Unplaced</h3>
          <p className="text-xs text-slate-600">These reviews are missing a performance or potential rating that fits the grid.</p>
          <ul className="mt-1">
            {section.unplaced.map((person) => (
              <li key={person.evaluationId}>
                <Link className="text-indigo-800 hover:underline" href={`/print/talent/${person.evaluationId}`}>{person.name}</Link>
                {section.showGroup ? ` · ${person.groupName}` : ""} · {person.performance || "No performance"} · {person.potential || "No potential"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <h3 className="font-semibold">Rank order</h3>
        {section.ranks.length === 0 ? <p className="text-slate-500">No ranks saved for this scope.</p> : (
          <table className="mt-1 w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border border-slate-300 px-2 py-1">Name</th>
                {section.showGroup ? <th className="border border-slate-300 px-2 py-1">Group</th> : null}
                <th className="border border-slate-300 px-2 py-1">Performance rank</th>
                <th className="border border-slate-300 px-2 py-1">Potential rank</th>
              </tr>
            </thead>
            <tbody>
              {section.ranks.map((rank) => (
                <tr key={rank.id}>
                  <td className="border border-slate-300 px-2 py-1">{rank.name}</td>
                  {section.showGroup ? <td className="border border-slate-300 px-2 py-1">{rank.groupName}</td> : null}
                  <td className="border border-slate-300 px-2 py-1">{rank.perfRank ?? "—"}</td>
                  <td className="border border-slate-300 px-2 py-1">{rank.potlRank ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
