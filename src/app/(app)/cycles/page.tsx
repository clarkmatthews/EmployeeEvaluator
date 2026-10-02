import Link from "next/link";
import { createCycle } from "@/actions/cycles";
import { Banner, Card, PageHeader, buttonClass, inputClass, labelClass } from "@/components/ui";
import { cycleIsLocked, dateInput, formKindLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function CyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const [cycles, formKinds, segments, groups] = await Promise.all([
    prisma.cycle.findMany({
      where: { companyId: session.companyId },
      include: { formKind: true, segmentType: true, groups: { include: { group: true } }, _count: { select: { evaluations: true } } },
      orderBy: [{ year: "desc" }, { openDate: "desc" }],
    }),
    prisma.formKind.findMany({ where: { companyId: session.companyId }, orderBy: { name: "asc" } }),
    prisma.segmentType.findMany({ where: { companyId: session.companyId }, orderBy: { name: "asc" } }),
    prisma.orgGroup.findMany({ where: { companyId: session.companyId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const year = new Date().getUTCFullYear();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evaluation cycles"
        detail="A cycle chooses the year, form, employee type, dates, and groups that will be evaluated."
        help="Create one cycle for performance appraisals and one for talent reviews. Assign the groups that will be evaluated and set the open and close dates. Lock a cycle when scoring should stop. A locked cycle can still unlock a single person's evaluation."
      />
      <Banner message={params.message} error={params.error} />
      <Card title="Existing cycles">
        <ul className="divide-y divide-slate-100">
          {cycles.map((cycle) => (
            <li key={cycle.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <Link className="font-medium text-indigo-700 hover:underline" href={`/cycles/${cycle.id}`}>
                  {cycle.year} {formKindLabel(cycle.formKind.name)}
                </Link>
                <p className="text-slate-500">
                  {cycle.segmentType.name} · {dateInput(cycle.openDate)} to {cycle.closeDate ? dateInput(cycle.closeDate) : "open"} · {cycle.groups.map((row) => row.group.name).join(", ") || "No groups"}
                </p>
              </div>
              <span>{cycleIsLocked(cycle) ? "Locked" : "Open"} · {cycle._count.evaluations} evaluations</span>
            </li>
          ))}
          {cycles.length === 0 ? <li className="py-2 text-sm text-slate-500">No cycles yet.</li> : null}
        </ul>
      </Card>
      <Card title="Add a cycle">
        <form action={createCycle} className="grid gap-3 sm:grid-cols-2">
          <label><span className={labelClass}>Year</span><input className={inputClass} name="year" type="number" defaultValue={year} required /></label>
          <label>
            <span className={labelClass}>Form</span>
            <select className={inputClass} name="formKindId" required>
              {formKinds.map((kind) => <option key={kind.id} value={kind.id}>{formKindLabel(kind.name)}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Employee type</span>
            <select className={inputClass} name="segmentTypeId" required>
              {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}
            </select>
          </label>
          <label><span className={labelClass}>Open date</span><input className={inputClass} name="openDate" type="date" required /></label>
          <label><span className={labelClass}>Close date</span><input className={inputClass} name="closeDate" type="date" /></label>
          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>Evaluate members of</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="groupId" value={group.id} /> {group.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button className={buttonClass} type="submit">Add cycle</button>
        </form>
      </Card>
    </div>
  );
}
