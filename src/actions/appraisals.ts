"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { accessibleGroupIds } from "@/lib/access";
import { canEditEvaluation } from "@/lib/access";
import { decOrNull, intOrNull, parseDate, text } from "@/lib/format";
import { templateInclude } from "@/lib/catalog";

export type ActionState = { error: string };

async function templateFor(companyId: string, year: number, whoType: string) {
  const formKind = await prisma.formKind.findFirst({ where: { companyId, name: "PA" } });
  if (!formKind) return null;
  const include = templateInclude;
  const specific = await prisma.appraisalTemplate.findFirst({
    where: { companyId, year, formKindId: formKind.id, whoType },
    include,
  });
  if (specific) return specific;
  return prisma.appraisalTemplate.findFirst({
    where: { companyId, year, formKindId: formKind.id, whoType: "All" },
    include,
  });
}

function levelValue(formData: FormData, name: string) {
  const value = intOrNull(formData, name);
  if (value == null) return null;
  if (value < 1 || value > 5) return null;
  return value;
}

export async function saveAppraisal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const cycleId = text(formData, "cycleId");
  const groupId = text(formData, "groupId");
  const employeeId = text(formData, "employeeId");
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId: session.companyId, formKind: { name: "PA" } },
    include: { groups: true },
  });
  const group = await prisma.orgGroup.findFirst({ where: { id: groupId, companyId: session.companyId } });
  const employee = await prisma.user.findFirst({ where: { id: employeeId, companyId: session.companyId } });
  const member = await prisma.groupMember.findFirst({ where: { groupId, userId: employeeId } });
  if (!cycle || !group || !employee || !member || !cycle.groups.some((row) => row.groupId === groupId)) {
    return { error: "That appraisal could not be found." };
  }
  const access = await accessibleGroupIds(session);
  const existingEval = await prisma.evaluation.findUnique({
    where: { cycleId_groupId_employeeId: { cycleId, groupId, employeeId } },
  });
  const edit = canEditEvaluation({
    ...{
      session,
      employeeStatus: employee.status,
      employeeId,
      groupAllowsSelfEdit: group.usersCanEditOwnAppraisal,
      hasGroupAccess: access.has(groupId),
      cycle,
    },
    unlocked: existingEval?.unlocked ?? false,
  });
  if (!edit.editable) return { error: edit.reason };

  const template = await templateFor(session.companyId, cycle.year, employee.whoType);
  if (!template) return { error: "No performance appraisal template exists for this year and employee type." };
  const needEmployee = edit.asEmployee && template.inclSelfRating;

  if (edit.asEmployee && template.inclMgrDutysSect) {
    const duty = decOrNull(formData, "mgrDutyPct");
    if (duty == null || duty <= 0) return { error: "Manager duty percent is required." };
  }

  const missing: string[] = [];
  if (template.inclKeysSect) {
    for (const row of template.keyItems) {
      if (needEmployee && levelValue(formData, `key-emp-${row.keyItemId}`) == null) missing.push(row.keyItem.name);
      if (edit.asSupervisor && levelValue(formData, `key-sup-${row.keyItemId}`) == null) missing.push(row.keyItem.name);
    }
  }
  if (template.inclScorecardSect) {
    for (const row of template.scorecardItems) {
      if (needEmployee && levelValue(formData, `sc-emp-${row.scorecardItemId}`) == null) missing.push(row.scorecardItem.name);
      if (edit.asSupervisor && levelValue(formData, `sc-sup-${row.scorecardItemId}`) == null) missing.push(row.scorecardItem.name);
    }
  }
  if (template.inclAcctSect) {
    for (const row of template.accountabilityItems) {
      if (needEmployee && levelValue(formData, `ac-emp-${row.accountabilityItemId}`) == null) missing.push(row.accountabilityItem.name);
      if (edit.asSupervisor && levelValue(formData, `ac-sup-${row.accountabilityItemId}`) == null) missing.push(row.accountabilityItem.name);
    }
  }
  if (template.inclG2GSect) {
    for (const row of template.behaviorItems) {
      if (needEmployee && levelValue(formData, `bh-emp-${row.behaviorItemId}`) == null) missing.push(row.behaviorItem.name);
      if (edit.asSupervisor && levelValue(formData, `bh-sup-${row.behaviorItemId}`) == null) missing.push(row.behaviorItem.name);
    }
  }
  if (missing.length) return { error: `Select a rating for: ${missing.join(", ")}.` };

  const evaluation = await prisma.evaluation.upsert({
    where: { cycleId_groupId_employeeId: { cycleId, groupId, employeeId } },
    create: {
      cycleId,
      groupId,
      employeeId,
      reviewerId: edit.asSupervisor ? session.userId : null,
    },
    update: edit.asSupervisor ? { reviewerId: session.userId } : {},
  });

  const appraisal = await prisma.appraisal.upsert({
    where: { evaluationId: evaluation.id },
    create: {
      evaluationId: evaluation.id,
      templateId: template.id,
      empComment: edit.asEmployee ? text(formData, "empComment") : "",
      superComment1: edit.asSupervisor ? text(formData, "superComment1") : "",
      superComment2: edit.asSupervisor ? text(formData, "superComment2") : "",
      superComment3: edit.asSupervisor ? text(formData, "superComment3") : "",
      mgrDutyPct: decOrNull(formData, "mgrDutyPct"),
      empSignature: edit.asEmployee ? text(formData, "empSignature") : "",
      supSignature: edit.asSupervisor ? text(formData, "supSignature") : "",
      approverSignature: edit.asSupervisor ? text(formData, "approverSignature") : "",
      otherJobsNote: text(formData, "otherJobsNote"),
    },
    update: {
      templateId: template.id,
      otherJobsNote: text(formData, "otherJobsNote"),
      ...(edit.asEmployee
        ? { empComment: text(formData, "empComment"), empSignature: text(formData, "empSignature") }
        : {}),
      ...(edit.asSupervisor
        ? {
            superComment1: text(formData, "superComment1"),
            superComment2: text(formData, "superComment2"),
            superComment3: text(formData, "superComment3"),
            supSignature: text(formData, "supSignature"),
            approverSignature: text(formData, "approverSignature"),
          }
        : {}),
      ...((edit.asEmployee || edit.asSupervisor) && template.inclMgrDutysSect
        ? { mgrDutyPct: decOrNull(formData, "mgrDutyPct") }
        : {}),
    },
  });

  for (const row of template.keyItems) {
    const shared = {
      targetAmount: decOrNull(formData, `key-target-${row.keyItemId}`),
      achievedAmount: decOrNull(formData, `key-achieved-${row.keyItemId}`),
    };
    const mine = {
      ...(edit.asEmployee
        ? {
            empLevel: levelValue(formData, `key-emp-${row.keyItemId}`),
            empComment: text(formData, `key-empComment-${row.keyItemId}`),
          }
        : {}),
      ...(edit.asSupervisor
        ? {
            supLevel: levelValue(formData, `key-sup-${row.keyItemId}`),
            supComment: text(formData, `key-supComment-${row.keyItemId}`),
          }
        : {}),
    };
    await prisma.appraisalKeyLine.upsert({
      where: { appraisalId_keyItemId: { appraisalId: appraisal.id, keyItemId: row.keyItemId } },
      create: { appraisalId: appraisal.id, keyItemId: row.keyItemId, ...shared, ...mine },
      update: { ...shared, ...mine },
    });
  }

  for (const row of template.scorecardItems) {
    const shared = {
      numberAmount: decOrNull(formData, `sc-count-${row.scorecardItemId}`),
      dollarAmount: decOrNull(formData, `sc-dollars-${row.scorecardItemId}`),
    };
    const mine = {
      ...(edit.asEmployee
        ? { empLevel: levelValue(formData, `sc-emp-${row.scorecardItemId}`), empComment: text(formData, `sc-empComment-${row.scorecardItemId}`) }
        : {}),
      ...(edit.asSupervisor
        ? { supLevel: levelValue(formData, `sc-sup-${row.scorecardItemId}`), supComment: text(formData, `sc-supComment-${row.scorecardItemId}`) }
        : {}),
    };
    await prisma.appraisalScorecardLine.upsert({
      where: { appraisalId_scorecardItemId: { appraisalId: appraisal.id, scorecardItemId: row.scorecardItemId } },
      create: { appraisalId: appraisal.id, scorecardItemId: row.scorecardItemId, ...shared, ...mine },
      update: { ...shared, ...mine },
    });
  }

  for (const row of template.accountabilityItems) {
    const mine = {
      text: text(formData, `ac-text-${row.accountabilityItemId}`) || row.accountabilityItem.name,
      ...(edit.asEmployee
        ? { empLevel: levelValue(formData, `ac-emp-${row.accountabilityItemId}`), empComment: text(formData, `ac-empComment-${row.accountabilityItemId}`) }
        : {}),
      ...(edit.asSupervisor
        ? { supLevel: levelValue(formData, `ac-sup-${row.accountabilityItemId}`), supComment: text(formData, `ac-supComment-${row.accountabilityItemId}`) }
        : {}),
    };
    await prisma.appraisalAccountabilityLine.upsert({
      where: { appraisalId_accountabilityItemId: { appraisalId: appraisal.id, accountabilityItemId: row.accountabilityItemId } },
      create: { appraisalId: appraisal.id, accountabilityItemId: row.accountabilityItemId, ...mine },
      update: mine,
    });
  }

  for (const row of template.behaviorItems) {
    const mine = {
      ...(edit.asEmployee
        ? { empLevel: levelValue(formData, `bh-emp-${row.behaviorItemId}`), empComment: text(formData, `bh-empComment-${row.behaviorItemId}`) }
        : {}),
      ...(edit.asSupervisor
        ? { supLevel: levelValue(formData, `bh-sup-${row.behaviorItemId}`), supComment: text(formData, `bh-supComment-${row.behaviorItemId}`) }
        : {}),
    };
    await prisma.appraisalBehaviorLine.upsert({
      where: { appraisalId_behaviorItemId: { appraisalId: appraisal.id, behaviorItemId: row.behaviorItemId } },
      create: { appraisalId: appraisal.id, behaviorItemId: row.behaviorItemId, ...mine },
      update: mine,
    });
  }

  if (template.inclG2GGoalsSect) {
    const count = intOrNull(formData, "goalCount") ?? 0;
    const goals = [];
    for (let index = 0; index < count; index += 1) {
      const goal = text(formData, `goal-${index}`);
      if (!goal) continue;
      goals.push({
        appraisalId: appraisal.id,
        goalNumber: goals.length + 1,
        goal,
        completionDate: parseDate(text(formData, `goalDate-${index}`)),
      });
    }
    await prisma.appraisalGoal.deleteMany({ where: { appraisalId: appraisal.id } });
    if (goals.length) await prisma.appraisalGoal.createMany({ data: goals });
  }

  revalidatePath("/appraisals");
  revalidatePath("/dashboard");
  redirect(`/appraisals?cycleId=${cycleId}&groupId=${groupId}&employeeId=${employeeId}&message=` + encodeURIComponent("Appraisal saved."));
}
