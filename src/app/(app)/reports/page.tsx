import { FilterableTable } from "@/components/filterable-table";
import { buttonClass, PageHeader } from "@/components/ui";
import { accessibleGroupIds } from "@/lib/access";
import { visibleEvaluationsWhere } from "@/lib/appraisal-report";
import { formKindLabel, personName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MATRIX_VIEWS } from "@/lib/talent-matrix";

const reportColumns = [
  { key: "employee", label: "Employee", filter: "search" as const },
  { key: "report", label: "Report", filter: "select" as const },
  { key: "cycle", label: "Cycle", filter: "select" as const },
  { key: "group", label: "Group", filter: "select" as const },
  { key: "updated", label: "Updated", filter: "search" as const },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string; report?: string; cycle?: string; group?: string; updated?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const showTalent = session.role !== "EMPLOYEE";
  const talentGroupIds = showTalent ? [...(await accessibleGroupIds(session))] : [];
  const [talentCycles, talentGroups] = showTalent
    ? await Promise.all([
        prisma.cycle.findMany({
          where: { companyId: session.companyId, formKind: { name: "TOPS" } },
          orderBy: [{ year: "desc" }, { openDate: "desc" }],
        }),
        talentGroupIds.length
          ? prisma.orgGroup.findMany({
              where: { companyId: session.companyId, id: { in: talentGroupIds } },
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
      ])
    : [[], []];
  const evaluationWhere = await visibleEvaluationsWhere(session);
  const reportInclude = {
    employee: true,
    group: true,
    cycle: { include: { formKind: true } },
  } as const;
  const [appraisals, talentReviews] = await Promise.all([
    prisma.appraisal.findMany({
      where: { evaluation: evaluationWhere },
      include: { evaluation: { include: reportInclude } },
      orderBy: { updatedAt: "desc" },
    }),
    showTalent
      ? prisma.talentReview.findMany({
          where: { evaluation: evaluationWhere },
          include: { evaluation: { include: reportInclude } },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  const rows = [
    ...appraisals.map((appraisal) => reportRow(
      `appraisal-${appraisal.id}`,
      appraisal.evaluation.employee,
      "Performance appraisal",
      `${appraisal.evaluation.cycle.year} ${formKindLabel(appraisal.evaluation.cycle.formKind.name)}`,
      appraisal.evaluation.group.name,
      appraisal.updatedAt,
      `/print/appraisal/${appraisal.evaluationId}`,
    )),
    ...talentReviews.map((review) => reportRow(
      `talent-${review.id}`,
      review.evaluation.employee,
      "Talent review",
      `${review.evaluation.cycle.year} ${formKindLabel(review.evaluation.cycle.formKind.name)}`,
      review.evaluation.group.name,
      review.updatedAt,
      `/print/talent/${review.evaluationId}`,
    )),
  ].sort((left, right) => right.updated.localeCompare(left.updated));

  return (
    <div>
      <PageHeader
        title="Reports"
        detail="Printed performance appraisals, and talent-review 9-box reports for a cycle and organization branch."
        help="Filter the saved-report table by employee, report type, cycle, group, or updated date, then open the print view. The talent 9-box can be built by group, rolled up through the groups under the starting group, or both. A person stays on the group where their talent review was saved."
      />
      {showTalent ? (
        <form action="/print/talent-matrix" className="mb-8 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Talent 9-box</h2>
          <p className="text-sm text-slate-600">Choose a talent-review cycle, the group to start from, and how the grid should be built.</p>
          {talentCycles.length === 0 || talentGroups.length === 0 ? (
            <p className="text-sm text-slate-500">A talent-review cycle and an organization group are needed before this report can be opened.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Cycle</span>
                  <select name="cycleId" className="w-full rounded-md border border-slate-300 px-3 py-2" required>
                    {talentCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.year} Talent review</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Starting group</span>
                  <select name="groupId" className="w-full rounded-md border border-slate-300 px-3 py-2" required>
                    {talentGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </label>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">How to build the report</legend>
                {MATRIX_VIEWS.map((view) => (
                  <label key={view.id} className="flex gap-2 text-sm">
                    <input className="mt-1" type="radio" name="view" value={view.id} defaultChecked={view.id === "both"} required />
                    <span><span className="font-medium">{view.label}.</span> {view.description}</span>
                  </label>
                ))}
              </fieldset>
              <button className={buttonClass} type="submit">Open report</button>
            </>
          )}
        </form>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <FilterableTable
          columns={reportColumns}
          noun="reports"
          empty="No reports match these filters."
          initialFilters={{
            employee: params.employee ?? "",
            report: params.report ?? "",
            cycle: params.cycle ?? "",
            group: params.group ?? "",
            updated: params.updated ?? "",
          }}
          rows={rows}
        />
      </div>
    </div>
  );
}

function reportRow(
  id: string,
  employee: { firstName: string; lastName: string; employeeNumber: string | null; status: "ACTIVE" | "LEAVE" | "INACTIVE" },
  report: string,
  cycle: string,
  group: string,
  updatedAt: Date,
  href: string,
) {
  const name = personName(employee);
  const updated = `${updatedAt.getUTCFullYear()}-${String(updatedAt.getUTCMonth() + 1).padStart(2, "0")}-${String(updatedAt.getUTCDate()).padStart(2, "0")}`;
  return {
    id,
    updated,
    cells: { employee: name, report, cycle, group, updated },
    search: { employee: `${name} ${employee.firstName} ${employee.lastName} ${employee.employeeNumber ?? ""}` },
    action: { href, label: "Open report" },
  };
}
