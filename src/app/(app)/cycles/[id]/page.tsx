import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleCycleLock, toggleEvaluationLock, updateCycle } from "@/actions/cycles";
import { Banner, Card, PageHeader, buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import { cycleIsLocked, dateInput, formKindLabel, personName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function CycleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const cycle = await prisma.cycle.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      formKind: true,
      segmentType: true,
      groups: true,
      history: { orderBy: { createdAt: "desc" }, take: 20 },
      evaluations: { include: { employee: true, group: true }, orderBy: { updatedAt: "desc" } },
      _count: { select: { evaluations: true } },
    },
  });
  if (!cycle) notFound();
  const [formKinds, segments, groups] = await Promise.all([
    prisma.formKind.findMany({ where: { companyId: session.companyId } }),
    prisma.segmentType.findMany({ where: { companyId: session.companyId } }),
    prisma.orgGroup.findMany({ where: { companyId: session.companyId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const locked = cycleIsLocked(cycle);
  const evalsExist = cycle._count.evaluations > 0;
  const selectedGroups = new Set(cycle.groups.map((group) => group.groupId));

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${cycle.year} ${formKindLabel(cycle.formKind.name)}`}
        detail={locked ? "Locked" : "Open"}
        help="Update the dates and the groups on this cycle. Locking closes scoring for everyone. After a cycle is locked, you can unlock one evaluation so that person can still be edited."
      />
      <Banner message={query.message} error={query.error} />
      <div className="flex flex-wrap gap-3">
        <Link className="text-sm text-indigo-700 hover:underline" href="/cycles">All cycles</Link>
        <form action={toggleCycleLock}>
          <input type="hidden" name="id" value={cycle.id} />
          <button className={secondaryButtonClass} type="submit">{cycle.locked ? "Unlock cycle" : "Lock cycle"}</button>
        </form>
      </div>
      {evalsExist ? <p className="text-sm text-slate-600">Evaluations exist, so year, form, employee type, and open date stay fixed. You can add groups and change the close date.</p> : null}
      <Card title="Cycle">
        <form action={updateCycle} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={cycle.id} />
          <label><span className={labelClass}>Year</span><input className={inputClass} name="year" type="number" defaultValue={cycle.year} disabled={evalsExist} /></label>
          <label>
            <span className={labelClass}>Form</span>
            <select className={inputClass} name="formKindId" defaultValue={cycle.formKindId} disabled={evalsExist}>
              {formKinds.map((kind) => <option key={kind.id} value={kind.id}>{formKindLabel(kind.name)}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Employee type</span>
            <select className={inputClass} name="segmentTypeId" defaultValue={cycle.segmentTypeId} disabled={evalsExist}>
              {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}
            </select>
          </label>
          <label><span className={labelClass}>Open date</span><input className={inputClass} name="openDate" type="date" defaultValue={dateInput(cycle.openDate)} disabled={evalsExist} /></label>
          <label><span className={labelClass}>Close date</span><input className={inputClass} name="closeDate" type="date" defaultValue={dateInput(cycle.closeDate)} /></label>
          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>Groups</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="groupId" value={group.id} defaultChecked={selectedGroups.has(group.id)} /> {group.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button className={buttonClass} type="submit">Save cycle</button>
        </form>
      </Card>
      {locked ? (
        <Card title="Individual evaluations">
          <ul className="divide-y divide-slate-100">
            {cycle.evaluations.map((evaluation) => (
              <li key={evaluation.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>{personName(evaluation.employee)} · {evaluation.group.name} · {evaluation.unlocked ? "Unlocked" : "Locked"}</span>
                <form action={toggleEvaluationLock}>
                  <input type="hidden" name="evaluationId" value={evaluation.id} />
                  <button className={secondaryButtonClass} type="submit">{evaluation.unlocked ? "Lock" : "Unlock"}</button>
                </form>
              </li>
            ))}
            {cycle.evaluations.length === 0 ? <li className="py-2 text-sm text-slate-500">No evaluations have been saved in this cycle.</li> : null}
          </ul>
        </Card>
      ) : null}
      <Card title="History">
        <ul className="space-y-2 text-sm">
          {cycle.history.map((entry) => (
            <li key={entry.id}>
              <span className="font-medium">{entry.action}</span> · {entry.actorName} · {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              {entry.comments ? <span className="text-slate-500"> · {entry.comments}</span> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
