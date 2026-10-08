import { EmployeePicker } from "@/components/employee-picker";
import { RankEditor } from "@/components/rank-editor";
import { TalentForm } from "@/components/talent-form";
import { Banner, Card, PageHeader } from "@/components/ui";
import { accessibleGroupIds, canEditEvaluation } from "@/lib/access";
import { personName } from "@/lib/format";
import { ggRatingTexts } from "@/lib/gg-ratings";
import { prisma } from "@/lib/prisma";
import { talentMark } from "@/lib/review-status";
import { requireRoles } from "@/lib/session";

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string; groupId?: string; employeeId?: string; inactive?: string; message?: string; error?: string }>;
}) {
  const session = await requireRoles(["ADMIN", "MANAGER"]);
  const params = await searchParams;
  const access = await accessibleGroupIds(session);
  const cycles = await prisma.cycle.findMany({
    where: { companyId: session.companyId, formKind: { name: "TOPS" } },
    include: { groups: { include: { group: true } } },
    orderBy: { year: "desc" },
  });
  const visible = cycles
    .map((cycle) => ({ ...cycle, groups: cycle.groups.filter((row) => access.has(row.groupId)) }))
    .filter((cycle) => cycle.groups.length > 0);
  const cycle = visible.find((item) => item.id === params.cycleId) ?? visible[0];
  const group = cycle?.groups.find((row) => row.groupId === params.groupId)?.group ?? cycle?.groups[0]?.group;
  const groupIds = [...new Set(visible.flatMap((item) => item.groups.map((row) => row.groupId)))];
  const cycleIds = visible.map((item) => item.id);
  const [memberships, ggItems, evaluations] = await Promise.all([
    groupIds.length ? prisma.groupMember.findMany({ where: { groupId: { in: groupIds } }, include: { user: true } }) : [],
    prisma.ggItem.findMany({ where: { companyId: session.companyId }, select: { id: true } }),
    cycleIds.length
      ? prisma.evaluation.findMany({
          where: { cycleId: { in: cycleIds }, groupId: { in: groupIds }, talentReview: { isNot: null } },
          include: { talentReview: { include: { ggResponses: true } } },
        })
      : [],
  ]);
  const ggItemIds = ggItems.map((item) => item.id);
  const pickerPeople = memberships.map((member) => ({
    id: member.user.id,
    groupId: member.groupId,
    name: personName(member.user),
    number: member.user.employeeNumber ?? "",
    status: member.user.status,
    marks: visible.flatMap((item) => {
      const review = evaluations.find((row) => row.cycleId === item.id && row.groupId === member.groupId && row.employeeId === member.user.id)?.talentReview;
      const mark = talentMark(review ?? null, ggItemIds);
      return mark === "I" ? [] : [{ cycleId: item.id, mark }];
    }),
  }));
  const people = pickerPeople
    .filter((person) => person.groupId === group?.id)
    .filter((person) => params.inactive === "1" || person.status !== "INACTIVE")
    .sort((a, b) => a.name.localeCompare(b.name));
  const employeePerson = people.find((person) => person.id === params.employeeId) ?? people[0];
  const employee = employeePerson ? memberships.find((member) => member.user.id === employeePerson.id)?.user : undefined;
  const pickerCycles = visible.map((item) => ({
    id: item.id,
    label: String(item.year),
    groups: item.groups.map((row) => ({ id: row.groupId, name: row.group.name })).sort((a, b) => a.name.localeCompare(b.name)),
  }));
  const ranks = cycle && group ? await prisma.talentRank.findMany({ where: { cycleId: cycle.id, groupId: group.id } }) : [];
  const perfOrder = ranks.filter((rank) => rank.perfRank).sort((a, b) => (a.perfRank ?? 0) - (b.perfRank ?? 0)).map((rank) => rank.userId);
  const potlOrder = ranks.filter((rank) => rank.potlRank).sort((a, b) => (a.potlRank ?? 0) - (b.potlRank ?? 0)).map((rank) => rank.userId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Talent reviews"
        detail="Choose a cycle and group. The employee list shows only people in that group. (C) is a complete review, (P) was saved with blank fields, and (I) has not been started."
        help="The employee list follows the group you select. (C) means every field on the form is filled, (P) means the review was saved with blank fields, and (I) means it has not been started. Rank the group by performance and by potential, then complete the 9-box ratings, plans, relocation, strengths, and Growth and Development items."
      />
      <Banner message={params.message} error={params.error} />
      {pickerCycles.length ? (
        <Card>
          <EmployeePicker
            path="/talent"
            cycles={pickerCycles}
            people={pickerPeople}
            value={{ cycleId: cycle?.id ?? "", groupId: group?.id ?? "", employeeId: employee?.id ?? "", inactive: params.inactive === "1" }}
          />
        </Card>
      ) : null}
      {cycle && group ? (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-4 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">›</span>
              Rankings for {group.name}
            </summary>
            <div className="px-4 pb-4">
              <RankEditor
                key={`${cycle.id}-${group.id}`}
                cycleId={cycle.id}
                groupId={group.id}
                people={people.map((person) => ({ id: person.id, name: person.name }))}
                perfOrder={perfOrder}
                potlOrder={potlOrder}
              />
            </div>
          </details>
        </section>
      ) : <Card><p className="text-sm text-slate-600">No talent-review cycle is available for your groups.</p></Card>}
      {cycle && group && employee ? <TalentBody cycleId={cycle.id} groupId={group.id} employee={employee} companyId={session.companyId} session={session} /> : null}
    </div>
  );
}

async function TalentBody({
  cycleId,
  groupId,
  employee,
  companyId,
  session,
}: {
  cycleId: string;
  groupId: string;
  employee: { id: string; status: "ACTIVE" | "LEAVE" | "INACTIVE"; firstName: string; lastName: string };
  companyId: string;
  session: { userId: string; companyId: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE"; email: string; firstName: string; lastName: string; name: string };
}) {
  const [cycle, group, access, items, company, evaluation] = await Promise.all([
    prisma.cycle.findFirst({ where: { id: cycleId, companyId } }),
    prisma.orgGroup.findFirst({ where: { id: groupId, companyId } }),
    accessibleGroupIds(session),
    prisma.ggItem.findMany({ where: { companyId }, orderBy: { itemSeq: "asc" } }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.evaluation.findUnique({
      where: { cycleId_groupId_employeeId: { cycleId, groupId, employeeId: employee.id } },
      include: { talentReview: { include: { ggResponses: true } } },
    }),
  ]);
  if (!cycle || !group) return null;
  const edit = canEditEvaluation({
    session,
    employeeStatus: employee.status,
    employeeId: employee.id,
    groupAllowsSelfEdit: false,
    hasGroupAccess: access.has(groupId),
    cycle,
    unlocked: evaluation?.unlocked ?? false,
  });
  const review = evaluation?.talentReview;
  const values: Record<string, string> = {
    performance: review?.performance ?? "",
    potential: review?.potential ?? "",
    perfTrend: review?.perfTrend ?? "",
    stpAction: review?.stpAction ?? "",
    stpExplanation: review?.stpExplanation ?? "",
    stpMove: review?.stpMove ?? "",
    stpBestFit: review?.stpBestFit ?? "",
    stpWhen: review?.stpWhen ?? "",
    ltpAction: review?.ltpAction ?? "",
    ltpExplanation: review?.ltpExplanation ?? "",
    ltpMove: review?.ltpMove ?? "",
    ltpBestFit: review?.ltpBestFit ?? "",
    ltpWhen: review?.ltpWhen ?? "",
    willingRelocate: review?.willingRelocate ?? "",
    geoPref: review?.geoPref ?? "",
    strength1: review?.strength1 ?? "",
    weakness1: review?.weakness1 ?? "",
    strength2: review?.strength2 ?? "",
    weakness2: review?.weakness2 ?? "",
    comments: review?.comments ?? "",
    questions: review?.questions ?? "",
  };
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{employee.firstName} {employee.lastName}</h2>
      <TalentForm
        key={`${cycleId}-${groupId}-${employee.id}`}
        cycleId={cycleId}
        groupId={groupId}
        employeeId={employee.id}
        editable={edit.editable && edit.asSupervisor}
        reason={edit.editable && edit.asSupervisor ? "" : edit.reason || "Managers rate talent reviews."}
        values={values}
        items={items.map((item) => ({
          id: item.id,
          itemText: item.itemText,
          helpText: item.helpText,
          rating: review?.ggResponses.find((response) => response.ggItemId === item.id)?.rating ?? null,
        }))}
        ratingTexts={[...ggRatingTexts(company)]}
        printHref={evaluation ? `/print/talent/${evaluation.id}` : undefined}
      />
    </div>
  );
}
