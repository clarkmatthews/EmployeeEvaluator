"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { ids, parseDate, text, todayUtcDate } from "@/lib/format";

function cyclePath(id: string, kind: "message" | "error", message: string): never {
  const params = new URLSearchParams();
  if (id) params.set("notice", kind);
  params.set(kind, message);
  redirect(id ? `/cycles/${id}?${params}` : `/cycles?${params}`);
}

export async function createCycle(formData: FormData) {
  const session = await requireAdmin();
  const year = Number(text(formData, "year"));
  const formKindId = text(formData, "formKindId");
  const segmentTypeId = text(formData, "segmentTypeId");
  const openDate = parseDate(text(formData, "openDate"));
  const closeRaw = text(formData, "closeDate");
  const closeDate = closeRaw ? parseDate(closeRaw) : null;
  const groupIds = ids(formData, "groupId");
  if (!year || !formKindId || !segmentTypeId || !openDate) {
    redirect("/cycles?error=" + encodeURIComponent("Year, form, employee type, and open date are required."));
  }
  if (closeDate && closeDate < openDate) {
    redirect("/cycles?error=" + encodeURIComponent("Close date must be on or after the open date."));
  }
  if (closeDate && closeDate < todayUtcDate()) {
    redirect("/cycles?error=" + encodeURIComponent("Close date must be today or later."));
  }
  if (groupIds.length === 0) {
    redirect("/cycles?error=" + encodeURIComponent("Select at least one group."));
  }
  const [formKind, segment, groups] = await Promise.all([
    prisma.formKind.findFirst({ where: { id: formKindId, companyId: session.companyId } }),
    prisma.segmentType.findFirst({ where: { id: segmentTypeId, companyId: session.companyId } }),
    prisma.orgGroup.findMany({ where: { companyId: session.companyId, id: { in: groupIds }, active: true } }),
  ]);
  if (!formKind || !segment || groups.length !== groupIds.length) {
    redirect("/cycles?error=" + encodeURIComponent("Form, employee type, or group was not found."));
  }
  const cycle = await prisma.cycle.create({
    data: {
      companyId: session.companyId,
      year,
      formKindId,
      segmentTypeId,
      openDate,
      closeDate,
      groups: { create: groups.map((group) => ({ groupId: group.id })) },
      history: {
        create: { action: "add", comments: "Cycle created", actorName: session.email, userId: session.userId },
      },
    },
  });
  revalidatePath("/cycles");
  redirect(`/cycles/${cycle.id}?message=` + encodeURIComponent("Cycle created."));
}

export async function updateCycle(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const cycle = await prisma.cycle.findFirst({
    where: { id, companyId: session.companyId },
    include: { _count: { select: { evaluations: true } }, groups: true },
  });
  if (!cycle) cyclePath("", "error", "Cycle not found.");
  const evalsExist = cycle!._count.evaluations > 0;
  const year = evalsExist ? cycle!.year : Number(text(formData, "year"));
  const formKindId = evalsExist ? cycle!.formKindId : text(formData, "formKindId");
  const segmentTypeId = evalsExist ? cycle!.segmentTypeId : text(formData, "segmentTypeId");
  const openDate = evalsExist ? cycle!.openDate : parseDate(text(formData, "openDate"));
  const closeRaw = text(formData, "closeDate");
  const closeDate = closeRaw ? parseDate(closeRaw) : null;
  const groupIds = ids(formData, "groupId");
  if (!year || !formKindId || !segmentTypeId || !openDate) cyclePath(id, "error", "Year, form, employee type, and open date are required.");
  if (closeDate && closeDate < openDate!) cyclePath(id, "error", "Close date must be on or after the open date.");
  if (groupIds.length === 0) cyclePath(id, "error", "Select at least one group.");
  if (evalsExist) {
    const existing = new Set(cycle!.groups.map((group) => group.groupId));
    for (const groupId of existing) {
      if (!groupIds.includes(groupId)) cyclePath(id, "error", "Groups cannot be removed after evaluations exist. You can add groups.");
    }
  }
  const groups = await prisma.orgGroup.findMany({
    where: { companyId: session.companyId, id: { in: groupIds } },
  });
  if (groups.length !== groupIds.length) cyclePath(id, "error", "A selected group was not found.");
  await prisma.$transaction([
    prisma.cycle.update({
      where: { id },
      data: { year, formKindId, segmentTypeId, openDate: openDate!, closeDate },
    }),
    prisma.cycleGroup.deleteMany({ where: { cycleId: id, groupId: { notIn: groupIds } } }),
    ...groupIds
      .filter((groupId) => !cycle!.groups.some((group) => group.groupId === groupId))
      .map((groupId) => prisma.cycleGroup.create({ data: { cycleId: id, groupId } })),
    prisma.cycleHistory.create({
      data: { cycleId: id, action: "edit", comments: "Cycle updated", actorName: session.email, userId: session.userId },
    }),
  ]);
  revalidatePath(`/cycles/${id}`);
  revalidatePath("/dashboard");
  cyclePath(id, "message", "Cycle updated.");
}

export async function toggleCycleLock(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const cycle = await prisma.cycle.findFirst({ where: { id, companyId: session.companyId } });
  if (!cycle) cyclePath("", "error", "Cycle not found.");
  const locking = !cycle!.locked;
  await prisma.$transaction([
    prisma.cycle.update({
      where: { id },
      data: locking
        ? { locked: true, closeDate: todayUtcDate() }
        : { locked: false, closeDate: null },
    }),
    ...(locking
      ? []
      : [prisma.evaluation.updateMany({ where: { cycleId: id }, data: { unlocked: false } })]),
    prisma.cycleHistory.create({
      data: {
        cycleId: id,
        action: locking ? "lock" : "unlock",
        comments: locking ? "Cycle locked" : "Cycle unlocked and individual unlocks cleared",
        actorName: session.email,
        userId: session.userId,
      },
    }),
  ]);
  revalidatePath(`/cycles/${id}`);
  cyclePath(id, "message", locking ? "Cycle locked." : "Cycle unlocked.");
}

export async function toggleEvaluationLock(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "evaluationId");
  const evaluation = await prisma.evaluation.findFirst({
    where: { id, cycle: { companyId: session.companyId } },
    include: { cycle: true },
  });
  if (!evaluation) cyclePath("", "error", "Evaluation not found.");
  if (!evaluation!.cycle.locked && !(evaluation!.cycle.closeDate && evaluation!.cycle.closeDate < todayUtcDate())) {
    cyclePath(evaluation!.cycleId, "error", "Individual unlock is available after the cycle is locked.");
  }
  const unlocked = !evaluation!.unlocked;
  await prisma.evaluation.update({ where: { id }, data: { unlocked } });
  await prisma.cycleHistory.create({
    data: {
      cycleId: evaluation!.cycleId,
      action: unlocked ? "unlock" : "lock",
      comments: `${unlocked ? "Unlocked" : "Locked"} evaluation ${id}`,
      actorName: session.email,
      userId: session.userId,
    },
  });
  revalidatePath(`/cycles/${evaluation!.cycleId}`);
  cyclePath(evaluation!.cycleId, "message", unlocked ? "Evaluation unlocked." : "Evaluation locked.");
}
