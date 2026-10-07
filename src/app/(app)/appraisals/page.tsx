import Link from "next/link";
import { AppraisalForm } from "@/components/appraisal-form";
import { EmployeePicker } from "@/components/employee-picker";
import { Banner, Card, PageHeader } from "@/components/ui";
import { accessibleGroupIds, canEditEvaluation, selfEditGroupIds } from "@/lib/access";
import { templateInclude } from "@/lib/catalog";
import { dateInput, num, personName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { appraisalMark, buildAppraisalStatus } from "@/lib/review-status";
import { requireUser } from "@/lib/session";
import type { LevelSource } from "@/lib/scoring";

export default async function AppraisalsPage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string; groupId?: string; employeeId?: string; inactive?: string; message?: string; error?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const cycles = await prisma.cycle.findMany({
    where: { companyId: session.companyId, formKind: { name: "PA" } },
    include: { groups: { include: { group: true } }, formKind: true },
    orderBy: { year: "desc" },
  });
  const [access, selfEdit] = await Promise.all([accessibleGroupIds(session), selfEditGroupIds(session)]);
  const visibleCycles = cycles
    .map((cycle) => ({
      ...cycle,
      groups: cycle.groups.filter((row) => access.has(row.groupId) || selfEdit.has(row.groupId) || session.role === "ADMIN"),
    }))
    .filter((cycle) => cycle.groups.length > 0);
  const cycle = visibleCycles.find((item) => item.id === params.cycleId) ?? visibleCycles[0];
  const group = cycle?.groups.find((row) => row.groupId === params.groupId)?.group ?? cycle?.groups[0]?.group;
  const groupIds = [...new Set(visibleCycles.flatMap((item) => item.groups.map((row) => row.groupId)))];
  const cycleIds = visibleCycles.map((item) => item.id);
  const years = [...new Set(visibleCycles.map((item) => item.year))];
  const [memberships, templates, evaluations] = await Promise.all([
    groupIds.length ? prisma.groupMember.findMany({ where: { groupId: { in: groupIds } }, include: { user: true } }) : [],
    years.length
      ? prisma.appraisalTemplate.findMany({
          where: { companyId: session.companyId, year: { in: years }, formKind: { name: "PA" } },
          include: { keyItems: true, scorecardItems: true, accountabilityItems: true, behaviorItems: true },
        })
      : [],
    cycleIds.length
      ? prisma.evaluation.findMany({
          where: {
            cycleId: { in: cycleIds },
            groupId: { in: groupIds },
            appraisal: { isNot: null },
            ...(session.role === "EMPLOYEE" ? { employeeId: session.userId } : {}),
          },
          include: {
            appraisal: {
              include: { keyLines: true, scorecardLines: true, accountabilityLines: true, behaviorLines: true, goals: true },
            },
          },
        })
      : [],
  ]);
  const pickerPeople = memberships
    .filter((member) => session.role !== "EMPLOYEE" || member.user.id === session.userId)
    .map((member) => ({
      id: member.user.id,
      groupId: member.groupId,
      name: personName(member.user),
      number: member.user.employeeNumber ?? "",
      status: member.user.status,
      marks: visibleCycles.flatMap((item) => {
        const template = templates.find((row) => row.year === item.year && row.whoType === member.user.whoType)
          ?? templates.find((row) => row.year === item.year && row.whoType === "All");
        const appraisal = evaluations.find((row) => row.cycleId === item.id && row.groupId === member.groupId && row.employeeId === member.user.id)?.appraisal;
        const mark = !appraisal ? "I" : template ? appraisalMark(buildAppraisalStatus(appraisal, template)) : "P";
        return mark === "I" ? [] : [{ cycleId: item.id, mark }];
      }),
    }));
  const people = pickerPeople
    .filter((person) => person.groupId === group?.id)
    .filter((person) => params.inactive === "1" || person.status !== "INACTIVE")
    .sort((a, b) => a.name.localeCompare(b.name));
  const employee = people.find((person) => person.id === params.employeeId) ?? people[0];
  const pickerCycles = visibleCycles.map((item) => ({
    id: item.id,
    label: String(item.year),
    groups: item.groups.map((row) => ({ id: row.groupId, name: row.group.name })).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Performance appraisals"
        detail="Choose a cycle and group. The employee list shows only people in that group. (C) is a complete appraisal, (P) was saved with blank fields, and (I) has not been started. Employee comments do not affect the mark."
        help="Search the employee list by name or employee number. (C) means every field except employee comments is filled, (P) means the appraisal was saved with something still blank, and (I) means nothing has been saved. Employees fill their column. Managers fill the supervisor column, including the approver signature. Key and scorecard ratings are suggested from the amounts you enter."
      />
      <Banner message={params.message} error={params.error} />
      {pickerCycles.length ? (
        <Card>
          <EmployeePicker
            path="/appraisals"
            cycles={pickerCycles}
            people={pickerPeople}
            value={{ cycleId: cycle?.id ?? "", groupId: group?.id ?? "", employeeId: employee?.id ?? "", inactive: params.inactive === "1" }}
          />
        </Card>
      ) : null}
      {cycle && group && employee ? (
        <AppraisalBody cycleId={cycle.id} groupId={group.id} employeeId={employee.id} sessionRole={session.role} sessionUserId={session.userId} companyId={session.companyId} />
      ) : (
        <Card><p className="text-sm text-slate-600">No appraisal is available for your access.</p></Card>
      )}
    </div>
  );
}

async function AppraisalBody({
  cycleId,
  groupId,
  employeeId,
  sessionRole,
  sessionUserId,
  companyId,
}: {
  cycleId: string;
  groupId: string;
  employeeId: string;
  sessionRole: "ADMIN" | "MANAGER" | "EMPLOYEE";
  sessionUserId: string;
  companyId: string;
}) {
  const [cycle, group, employee, access] = await Promise.all([
    prisma.cycle.findFirst({ where: { id: cycleId, companyId } }),
    prisma.orgGroup.findFirst({ where: { id: groupId, companyId } }),
    prisma.user.findFirst({ where: { id: employeeId, companyId } }),
    accessibleGroupIds({ userId: sessionUserId, companyId, role: sessionRole, email: "", firstName: "", lastName: "", name: "" }),
  ]);
  if (!cycle || !group || !employee) return null;
  const evaluation = await prisma.evaluation.findUnique({
    where: { cycleId_groupId_employeeId: { cycleId, groupId, employeeId } },
    include: {
      appraisal: {
        include: { keyLines: true, scorecardLines: true, accountabilityLines: true, behaviorLines: true, goals: { orderBy: { goalNumber: "asc" } } },
      },
    },
  });
  const formKind = await prisma.formKind.findFirst({ where: { companyId, name: "PA" } });
  const template = formKind
    ? (await prisma.appraisalTemplate.findFirst({
        where: { companyId, year: cycle.year, formKindId: formKind.id, whoType: employee.whoType },
        include: templateInclude,
      })) ??
      (await prisma.appraisalTemplate.findFirst({
        where: { companyId, year: cycle.year, formKindId: formKind.id, whoType: "All" },
        include: templateInclude,
      }))
    : null;
  if (!template) {
    return <Card><p className="text-sm">No template for {cycle.year} / {employee.whoType}. <Link className="text-indigo-700 hover:underline" href="/templates">Create one</Link>.</p></Card>;
  }
  const edit = canEditEvaluation({
    session: { userId: sessionUserId, companyId, role: sessionRole, email: "", firstName: "", lastName: "", name: "" },
    employeeStatus: employee.status,
    employeeId,
    groupAllowsSelfEdit: group.usersCanEditOwnAppraisal,
    hasGroupAccess: access.has(groupId),
    cycle,
    unlocked: evaluation?.unlocked ?? false,
  });
  const appraisal = evaluation?.appraisal;
  const prepop = await prisma.keyItemValue.findMany({ where: { cycleId, userId: employeeId } });
  const keys = template.keyItems.map((row) => {
    const line = appraisal?.keyLines.find((item) => item.keyItemId === row.keyItemId);
    const values = prepop.filter((value) => value.keyItemId === row.keyItemId);
    const target = line?.targetAmount != null ? num(line.targetAmount) : num(values.find((value) => value.sortOrder === 1)?.value ?? null);
    const achieved = line?.achievedAmount != null ? num(line.achievedAmount) : num(values.find((value) => value.sortOrder === 2)?.value ?? null);
    return { ...rated(row.keyItem), target, achieved, empLevel: line?.empLevel ?? null, supLevel: line?.supLevel ?? null, empComment: line?.empComment ?? "", supComment: line?.supComment ?? "" };
  });
  const scorecards = template.scorecardItems.map((row) => {
    const line = appraisal?.scorecardLines.find((item) => item.scorecardItemId === row.scorecardItemId);
    return { ...rated(row.scorecardItem), count: num(line?.numberAmount), dollars: num(line?.dollarAmount), empLevel: line?.empLevel ?? null, supLevel: line?.supLevel ?? null, empComment: line?.empComment ?? "", supComment: line?.supComment ?? "" };
  });
  const accountabilities = template.accountabilityItems.map((row) => {
    const line = appraisal?.accountabilityLines.find((item) => item.accountabilityItemId === row.accountabilityItemId);
    return { ...rated(row.accountabilityItem), text: line?.text || row.accountabilityItem.name, empLevel: line?.empLevel ?? null, supLevel: line?.supLevel ?? null, empComment: line?.empComment ?? "", supComment: line?.supComment ?? "" };
  });
  const behaviors = template.behaviorItems.map((row) => {
    const line = appraisal?.behaviorLines.find((item) => item.behaviorItemId === row.behaviorItemId);
    return { ...rated(row.behaviorItem), empLevel: line?.empLevel ?? null, supLevel: line?.supLevel ?? null, empComment: line?.empComment ?? "", supComment: line?.supComment ?? "" };
  });

  return (
    <AppraisalForm
      key={`${cycleId}-${groupId}-${employeeId}`}
      cycleId={cycleId}
      groupId={groupId}
      employeeId={employeeId}
      editable={edit.editable}
      reason={edit.editable ? "" : edit.reason}
      asEmployee={edit.asEmployee}
      asSupervisor={edit.asSupervisor}
      showEmployeeColumn={template.inclSelfRating}
      eeMin={template.eeMin}
      meMin={template.meMin}
      template={{
        inclEmplInfo: template.inclEmplInfo,
        inclOthrJobs: template.inclOthrJobs,
        inclInstruct: template.inclInstruct,
        inclKeysSect: template.inclKeysSect,
        inclScorecardSect: template.inclScorecardSect,
        inclAcctSect: template.inclAcctSect,
        inclG2GSect: template.inclG2GSect,
        inclPerfSummSect: template.inclPerfSummSect,
        inclSuper1CmtSect: template.inclSuper1CmtSect,
        inclSuper2CmtSect: template.inclSuper2CmtSect,
        inclSuper3CmtSect: template.inclSuper3CmtSect,
        inclMgrDutysSect: template.inclMgrDutysSect,
        inclRatingsSummSect: template.inclRatingsSummSect,
        inclG2GGoalsSect: template.inclG2GGoalsSect,
        inclApprSigsSect: template.inclApprSigsSect,
        formInstructTitle: template.formInstructTitle,
        formInstruct: template.formInstruct,
        keysSectTitle: template.keysSectTitle,
        keysSectInstruct: template.keysSectInstruct,
        scorecardSectTitle: template.scorecardSectTitle,
        scorecardSectInstruct: template.scorecardSectInstruct,
        acctSectTitle: template.acctSectTitle,
        acctSectInstruct: template.acctSectInstruct,
        g2gBehaveSectTitle: template.g2gBehaveSectTitle,
        g2gBehaveSectInstruct: template.g2gBehaveSectInstruct,
        g2gBehaveSectLegend: template.g2gBehaveSectLegend,
        perfSummSectTitle: template.perfSummSectTitle,
        superCmt1Title: template.superCmt1Title,
        superCmt2Title: template.superCmt2Title,
        superCmt3Title: template.superCmt3Title,
        mgrDutysSectTitle: template.mgrDutysSectTitle,
        mgrDutysSectText: template.mgrDutysSectText,
        g2gGoalsSectTitle: template.g2gGoalsSectTitle,
        g2gGoalsSectInstruct: template.g2gGoalsSectInstruct,
        signatureCompleterEmpTitle: template.signatureCompleterEmpTitle,
        signatureCompleterSupTitle: template.signatureCompleterSupTitle,
        signatureApproverTitle: template.signatureApproverTitle,
        signatureEmployeeTitle: template.signatureEmployeeTitle,
      }}
      employeeInfo={{
        name: `${employee.firstName} ${employee.lastName}`,
        jobTitle: employee.jobTitle,
        department: employee.department,
        employeeNumber: employee.employeeNumber ?? "",
      }}
      keys={keys}
      scorecards={scorecards}
      accountabilities={accountabilities}
      behaviors={behaviors}
      goals={(appraisal?.goals ?? []).map((goal) => ({ goal: goal.goal, completionDate: dateInput(goal.completionDate) }))}
      comments={{ emp: appraisal?.empComment ?? "", super1: appraisal?.superComment1 ?? "", super2: appraisal?.superComment2 ?? "", super3: appraisal?.superComment3 ?? "" }}
      mgrDutyPct={num(appraisal?.mgrDutyPct)}
      otherJobsNote={appraisal?.otherJobsNote ?? ""}
      signatures={{ emp: appraisal?.empSignature ?? "", sup: appraisal?.supSignature ?? "", approver: appraisal?.approverSignature ?? "" }}
      printHref={evaluation ? `/print/appraisal/${evaluation.id}` : undefined}
    />
  );
}

function rated(item: { id: string; name: string } & LevelSource) {
  return {
    id: item.id,
    name: item.name,
    p1Incl: item.p1Incl,
    p2Incl: item.p2Incl,
    p3Incl: item.p3Incl,
    p4Incl: item.p4Incl,
    p5Incl: item.p5Incl,
    p1Score: item.p1Score,
    p2Score: item.p2Score,
    p3Score: item.p3Score,
    p4Score: item.p4Score,
    p5Score: item.p5Score,
    p1Min: num(item.p1Min),
    p2Min: num(item.p2Min),
    p3Min: num(item.p3Min),
    p4Min: num(item.p4Min),
    p5Min: num(item.p5Min),
    p1Label: item.p1Label,
    p2Label: item.p2Label,
    p3Label: item.p3Label,
    p4Label: item.p4Label,
    p5Label: item.p5Label,
  };
}
