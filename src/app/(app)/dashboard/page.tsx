import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { accessibleGroupIds } from "@/lib/access";
import type { SessionUser } from "@/lib/scoring";
import { Banner, Card, PageHeader } from "@/components/ui";
import { cycleIsLocked, formKindLabel } from "@/lib/format";
import { appraisalMark, buildAppraisalStatus, talentMark } from "@/lib/review-status";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const scope = await groupScope(session);
  const [company, activeGroups, cycles, templates, ggItems] = await Promise.all([
    prisma.company.findUnique({ where: { id: session.companyId } }),
    prisma.orgGroup.findMany({
      where: { companyId: session.companyId, active: true, ...(scope ? { id: { in: scope } } : {}) },
      select: { id: true, members: { select: { user: { select: { id: true, status: true } } } } },
    }),
    prisma.cycle.findMany({
      where: { companyId: session.companyId },
      include: {
        formKind: true,
        segmentType: true,
        groups: { select: { groupId: true, group: { select: { active: true } } } },
        evaluations: {
          ...(scope ? { where: { groupId: { in: scope } } } : {}),
          select: {
            employeeId: true,
            employee: { select: { whoType: true } },
            appraisal: {
              include: { keyLines: true, scorecardLines: true, accountabilityLines: true, behaviorLines: true, goals: true },
            },
            talentReview: { include: { ggResponses: true } },
          },
        },
      },
      orderBy: [{ year: "desc" }, { openDate: "desc" }],
    }),
    prisma.appraisalTemplate.findMany({
      where: { companyId: session.companyId, formKind: { name: "PA" } },
      include: { keyItems: true, scorecardItems: true, accountabilityItems: true, behaviorItems: true },
    }),
    prisma.ggItem.findMany({ where: { companyId: session.companyId }, select: { id: true } }),
  ]);

  const peopleInActiveGroups = new Set<string>();
  const membersByGroup = new Map<string, Set<string>>();
  for (const group of activeGroups) {
    const members = new Set<string>();
    for (const member of group.members) {
      if (member.user.status === "INACTIVE") continue;
      members.add(member.user.id);
      peopleInActiveGroups.add(member.user.id);
    }
    membersByGroup.set(group.id, members);
  }

  const progress = cycles.map((cycle) => {
    const required = new Set<string>();
    for (const assignment of cycle.groups) {
      if (!assignment.group.active) continue;
      if (scope && !scope.includes(assignment.groupId)) continue;
      for (const userId of membersByGroup.get(assignment.groupId) ?? []) required.add(userId);
    }
    const completed = new Set<string>();
    for (const evaluation of cycle.evaluations) {
      if (!required.has(evaluation.employeeId)) continue;
      if (reviewComplete(cycle, evaluation, templates, ggItems.map((item) => item.id))) completed.add(evaluation.employeeId);
    }
    return {
      id: cycle.id,
      year: cycle.year,
      kind: cycle.formKind.name,
      label: formKindLabel(cycle.formKind.name),
      segment: cycle.segmentType.name,
      locked: cycleIsLocked(cycle),
      required: required.size,
      completed: completed.size,
    };
  });
  const latestAppraisal = progress.find((cycle) => cycle.kind === "PA");
  const latestTalent = progress.find((cycle) => cycle.kind === "TOPS");
  const scopeDetail = session.role === "MANAGER" ? "In the groups you can access." : session.role === "EMPLOYEE" ? "In the active groups you belong to." : "Across active groups in the company.";

  return (
    <div className="space-y-5">
      <PageHeader
        title={company?.name ?? "Dashboard"}
        detail={`Signed in as ${session.name}`}
        help="People in active groups are counted once, even if they belong to more than one group. The appraisal and talent cards use the latest cycle of each kind. A review counts as completed when its fields are filled. Employee comments are optional. Adding a person to an active group raises the total. Finishing a review raises the completed number."
      />
      <Banner message={params.message} error={params.error} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="People in active groups">
          <p className="text-3xl font-semibold">{peopleInActiveGroups.size}</p>
          <p className="mt-1 text-sm text-slate-500">{scopeDetail}</p>
        </Card>
        <CompletionCard title="Appraisals completed" cycle={latestAppraisal} />
        <CompletionCard title="Talent reviews completed" cycle={latestTalent} />
      </div>
      <Card title="Recent cycles">
        <ul className="divide-y divide-slate-100">
          {progress.slice(0, 6).map((cycle) => (
            <li key={cycle.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                {cycle.year} {cycle.label} · {cycle.segment}
              </span>
              <span className="text-slate-500">{completionText(cycle)} · {cycle.locked ? "Locked" : "Open"}</span>
            </li>
          ))}
          {progress.length === 0 ? <li className="py-2 text-sm text-slate-500">No cycles yet.</li> : null}
        </ul>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link className="text-indigo-700 hover:underline" href="/appraisals">Open appraisals</Link>
          <Link className="text-indigo-700 hover:underline" href="/reports">Open reports</Link>
          {session.role !== "EMPLOYEE" ? <Link className="text-indigo-700 hover:underline" href="/talent">Open talent reviews</Link> : null}
        </div>
      </Card>
    </div>
  );
}

function CompletionCard({
  title,
  cycle,
}: {
  title: string;
  cycle?: { year: number; label: string; required: number; completed: number };
}) {
  const percent = cycle && cycle.required > 0 ? Math.round((cycle.completed / cycle.required) * 100) : 0;
  return (
    <Card title={title}>
      {cycle ? (
        <>
          <p className="text-3xl font-semibold">{cycle.completed}<span className="text-lg font-medium text-slate-500"> of {cycle.required}</span></p>
          <p className="mt-1 text-sm text-slate-500">{cycle.year} {cycle.label}. A saved review counts when its fields are filled. Employee comments are optional.</p>
          <div className="mt-3" style={{ height: "0.5rem", overflow: "hidden", borderRadius: "9999px", background: "#e2e8f0" }}>
            <div style={{ height: "100%", width: `${percent}%`, borderRadius: "9999px", background: "#4f46e5" }} />
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">No cycle yet.</p>
      )}
    </Card>
  );
}

function completionText(cycle: { required: number; completed: number }) {
  if (cycle.required === 0) return "No people assigned";
  return `${cycle.completed} of ${cycle.required} completed`;
}

function reviewComplete(
  cycle: { year: number; formKind: { name: string } },
  evaluation: {
    employee: { whoType: string };
    appraisal: Parameters<typeof buildAppraisalStatus>[0] | null;
    talentReview: Parameters<typeof talentMark>[0];
  },
  templates: (Parameters<typeof buildAppraisalStatus>[1] & { year: number; whoType: string })[],
  ggItemIds: string[],
) {
  if (cycle.formKind.name === "PA") {
    if (!evaluation.appraisal) return false;
    const template = templates.find((item) => item.year === cycle.year && item.whoType === evaluation.employee.whoType)
      ?? templates.find((item) => item.year === cycle.year && item.whoType === "All");
    return template ? appraisalMark(buildAppraisalStatus(evaluation.appraisal, template)) === "C" : false;
  }
  return talentMark(evaluation.talentReview, ggItemIds) === "C";
}

async function groupScope(session: SessionUser) {
  if (session.role === "ADMIN") return null;
  if (session.role === "MANAGER") {
    const ids = [...(await accessibleGroupIds(session))];
    return ids.length ? ids : ["__none__"];
  }
  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.userId, group: { companyId: session.companyId, active: true } },
    select: { groupId: true },
  });
  const ids = memberships.map((row) => row.groupId);
  return ids.length ? ids : ["__none__"];
}
