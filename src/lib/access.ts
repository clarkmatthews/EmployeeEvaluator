import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/scoring";
import { descendantIds } from "@/lib/hierarchy";
import { cycleIsLocked } from "@/lib/format";

export async function companyLinks(companyId: string) {
  const groups = await prisma.orgGroup.findMany({
    where: { companyId },
    select: { id: true, parentLinks: { select: { parentId: true, childId: true } } },
  });
  const links = groups.flatMap((group) => group.parentLinks);
  return { groups, links };
}

export async function accessibleGroupIds(session: SessionUser) {
  if (session.role === "ADMIN") {
    const groups = await prisma.orgGroup.findMany({
      where: { companyId: session.companyId },
      select: { id: true },
    });
    return new Set(groups.map((group) => group.id));
  }
  if (session.role !== "MANAGER") return new Set<string>();
  const owned = await prisma.groupOwner.findMany({
    where: { userId: session.userId, group: { companyId: session.companyId } },
    select: { groupId: true },
  });
  const { links } = await companyLinks(session.companyId);
  return descendantIds(
    owned.map((row) => row.groupId),
    links,
  );
}

export async function selfEditGroupIds(session: SessionUser) {
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId: session.userId,
      group: { companyId: session.companyId, usersCanEditOwnAppraisal: true, active: true },
    },
    select: { groupId: true },
  });
  return new Set(memberships.map((row) => row.groupId));
}

export function canEditEvaluation(input: {
  session: SessionUser;
  employeeStatus: "ACTIVE" | "LEAVE" | "INACTIVE";
  employeeId: string;
  groupAllowsSelfEdit: boolean;
  hasGroupAccess: boolean;
  cycle: { locked: boolean; closeDate: Date | null };
  unlocked: boolean;
}) {
  const isSelf = input.session.userId === input.employeeId;
  const asEmployee = isSelf && input.groupAllowsSelfEdit;
  const asSupervisor =
    !isSelf && (input.session.role === "ADMIN" || (input.session.role === "MANAGER" && input.hasGroupAccess));
  if (input.employeeStatus === "INACTIVE") {
    return { editable: false, reason: "Inactive employees cannot be edited.", asEmployee, asSupervisor };
  }
  if (cycleIsLocked(input.cycle) && !input.unlocked) {
    return { editable: false, reason: "This cycle is locked.", asEmployee, asSupervisor };
  }
  if (!asEmployee && !asSupervisor) {
    return { editable: false, reason: "You cannot edit this evaluation.", asEmployee: false, asSupervisor: false };
  }
  return { editable: true, reason: "", asEmployee, asSupervisor };
}
