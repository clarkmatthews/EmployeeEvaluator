"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/session";
import { accessibleGroupIds, canEditEvaluation } from "@/lib/access";
import { cycleIsLocked, intOrNull, text } from "@/lib/format";

export type ActionState = { error: string };

const required = ["performance", "potential", "perfTrend"] as const;

export async function saveTalent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRoles(["ADMIN", "MANAGER"]);
  const cycleId = text(formData, "cycleId");
  const groupId = text(formData, "groupId");
  const employeeId = text(formData, "employeeId");
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId: session.companyId, formKind: { name: "TOPS" } },
    include: { groups: true },
  });
  const group = await prisma.orgGroup.findFirst({ where: { id: groupId, companyId: session.companyId } });
  const employee = await prisma.user.findFirst({ where: { id: employeeId, companyId: session.companyId } });
  const member = await prisma.groupMember.findFirst({ where: { groupId, userId: employeeId } });
  if (!cycle || !group || !employee || !member || !cycle.groups.some((row) => row.groupId === groupId)) {
    return { error: "That talent review could not be found." };
  }
  const access = await accessibleGroupIds(session);
  const existing = await prisma.evaluation.findUnique({
    where: { cycleId_groupId_employeeId: { cycleId, groupId, employeeId } },
  });
  const edit = canEditEvaluation({
    session,
    employeeStatus: employee.status,
    employeeId,
    groupAllowsSelfEdit: false,
    hasGroupAccess: access.has(groupId),
    cycle,
    unlocked: existing?.unlocked ?? false,
  });
  if (!edit.asSupervisor || !edit.editable) return { error: edit.reason || "You cannot edit this talent review." };
  for (const field of required) {
    if (!text(formData, field)) return { error: "Performance, potential, and trend are required." };
  }
  const items = await prisma.ggItem.findMany({ where: { companyId: session.companyId }, orderBy: { itemSeq: "asc" } });
  for (const item of items) {
    const rating = intOrNull(formData, `gg-${item.id}`);
    if (rating == null || rating < 1 || rating > 5) return { error: `Select a rating for ${item.itemText}.` };
  }

  const evaluation = await prisma.evaluation.upsert({
    where: { cycleId_groupId_employeeId: { cycleId, groupId, employeeId } },
    create: { cycleId, groupId, employeeId, reviewerId: session.userId },
    update: { reviewerId: session.userId },
  });
  const review = await prisma.talentReview.upsert({
    where: { evaluationId: evaluation.id },
    create: {
      evaluationId: evaluation.id,
      perfTrend: text(formData, "perfTrend"),
      performance: text(formData, "performance"),
      potential: text(formData, "potential"),
      stpAction: text(formData, "stpAction"),
      stpExplanation: text(formData, "stpExplanation"),
      stpMove: text(formData, "stpMove"),
      stpBestFit: text(formData, "stpBestFit"),
      stpWhen: text(formData, "stpWhen"),
      ltpAction: text(formData, "ltpAction"),
      ltpExplanation: text(formData, "ltpExplanation"),
      ltpMove: text(formData, "ltpMove"),
      ltpBestFit: text(formData, "ltpBestFit"),
      ltpWhen: text(formData, "ltpWhen"),
      willingRelocate: text(formData, "willingRelocate"),
      geoPref: text(formData, "geoPref"),
      strength1: text(formData, "strength1"),
      weakness1: text(formData, "weakness1"),
      strength2: text(formData, "strength2"),
      weakness2: text(formData, "weakness2"),
      comments: text(formData, "comments"),
      questions: text(formData, "questions"),
    },
    update: {
      perfTrend: text(formData, "perfTrend"),
      performance: text(formData, "performance"),
      potential: text(formData, "potential"),
      stpAction: text(formData, "stpAction"),
      stpExplanation: text(formData, "stpExplanation"),
      stpMove: text(formData, "stpMove"),
      stpBestFit: text(formData, "stpBestFit"),
      stpWhen: text(formData, "stpWhen"),
      ltpAction: text(formData, "ltpAction"),
      ltpExplanation: text(formData, "ltpExplanation"),
      ltpMove: text(formData, "ltpMove"),
      ltpBestFit: text(formData, "ltpBestFit"),
      ltpWhen: text(formData, "ltpWhen"),
      willingRelocate: text(formData, "willingRelocate"),
      geoPref: text(formData, "geoPref"),
      strength1: text(formData, "strength1"),
      weakness1: text(formData, "weakness1"),
      strength2: text(formData, "strength2"),
      weakness2: text(formData, "weakness2"),
      comments: text(formData, "comments"),
      questions: text(formData, "questions"),
    },
  });
  for (const item of items) {
    await prisma.talentGgResponse.upsert({
      where: { talentReviewId_ggItemId: { talentReviewId: review.id, ggItemId: item.id } },
      create: { talentReviewId: review.id, ggItemId: item.id, rating: intOrNull(formData, `gg-${item.id}`) ?? 0 },
      update: { rating: intOrNull(formData, `gg-${item.id}`) ?? 0 },
    });
  }
  revalidatePath("/talent");
  revalidatePath("/dashboard");
  redirect(`/talent?cycleId=${cycleId}&groupId=${groupId}&employeeId=${employeeId}&message=` + encodeURIComponent("Talent review saved."));
}

export async function saveRanks(formData: FormData) {
  const session = await requireRoles(["ADMIN", "MANAGER"]);
  const cycleId = text(formData, "cycleId");
  const groupId = text(formData, "groupId");
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId: session.companyId, formKind: { name: "TOPS" } },
    include: { groups: { select: { groupId: true } } },
  });
  const access = await accessibleGroupIds(session);
  if (!cycle || !access.has(groupId) || !cycle.groups.some((row) => row.groupId === groupId)) {
    redirect("/talent?error=" + encodeURIComponent("You cannot rank that group."));
  }
  if (cycleIsLocked(cycle)) {
    redirect(`/talent?cycleId=${cycleId}&groupId=${groupId}&error=` + encodeURIComponent("This cycle is locked."));
  }
  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  const allowed = new Set(members.map((member) => member.userId));
  const perf = text(formData, "perfOrder").split(",").map((id) => id.trim()).filter((id) => allowed.has(id));
  const potl = text(formData, "potlOrder").split(",").map((id) => id.trim()).filter((id) => allowed.has(id));
  await prisma.$transaction([
    prisma.talentRank.deleteMany({ where: { cycleId, groupId } }),
    prisma.talentRank.createMany({
      data: [...allowed].map((userId) => ({
        cycleId,
        groupId,
        userId,
        perfRank: perf.indexOf(userId) >= 0 ? perf.indexOf(userId) + 1 : null,
        potlRank: potl.indexOf(userId) >= 0 ? potl.indexOf(userId) + 1 : null,
      })),
    }),
  ]);
  revalidatePath("/talent");
  redirect(`/talent?cycleId=${cycleId}&groupId=${groupId}&message=` + encodeURIComponent("Rankings saved."));
}
