"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { ASSISTANT_MANAGER, checked, ids, text } from "@/lib/format";
import { companyLinks } from "@/lib/access";
import { wouldCycle } from "@/lib/hierarchy";

async function groupInCompany(companyId: string, id: string) {
  return prisma.orgGroup.findFirst({
    where: { id, companyId },
    include: { groupType: true, members: true, owners: true, childLinks: true, parentLinks: true },
  });
}

function back(id: string, kind: "message" | "error", message: string): never {
  const params = new URLSearchParams();
  if (id) params.set("group", id);
  params.set(kind, message);
  redirect("/organization?" + params.toString());
}

export async function createGroup(formData: FormData) {
  const session = await requireAdmin();
  const name = text(formData, "name");
  const groupTypeId = text(formData, "groupTypeId");
  const parentId = text(formData, "parentId");
  if (!name || !groupTypeId) back("", "error", "Name and group type are required.");
  const type = await prisma.groupType.findFirst({ where: { id: groupTypeId, companyId: session.companyId } });
  if (!type) back("", "error", "Group type not found.");
  const duplicate = await prisma.orgGroup.findFirst({
    where: { companyId: session.companyId, name: { equals: name, mode: "insensitive" }, active: true },
  });
  if (duplicate) back("", "error", "An active group with that name already exists.");
  const selfEdit = type!.name === ASSISTANT_MANAGER ? false : checked(formData, "usersCanEditOwnAppraisal");
  const group = await prisma.orgGroup.create({
    data: {
      companyId: session.companyId,
      groupTypeId,
      name,
      usersCanEditOwnAppraisal: selfEdit,
    },
  });
  if (parentId) {
    const parent = await groupInCompany(session.companyId, parentId);
    if (!parent) back(group.id, "error", "Parent group not found.");
    await prisma.groupLink.create({ data: { parentId, childId: group.id } });
  }
  revalidatePath("/organization");
  back(group.id, "message", "Group added.");
}

export async function updateGroup(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const group = await groupInCompany(session.companyId, id);
  if (!group) back("", "error", "Group not found.");
  const name = text(formData, "name");
  const groupTypeId = text(formData, "groupTypeId");
  const type = await prisma.groupType.findFirst({ where: { id: groupTypeId, companyId: session.companyId } });
  if (!name || !type) back(id, "error", "Name and group type are required.");
  const duplicate = await prisma.orgGroup.findFirst({
    where: {
      companyId: session.companyId,
      name: { equals: name, mode: "insensitive" },
      active: true,
      NOT: { id },
    },
  });
  if (duplicate) back(id, "error", "An active group with that name already exists.");
  const selfEdit = type!.name === ASSISTANT_MANAGER ? false : checked(formData, "usersCanEditOwnAppraisal");
  await prisma.orgGroup.update({
    where: { id },
    data: { name, groupTypeId, usersCanEditOwnAppraisal: selfEdit, active: checked(formData, "active") },
  });
  revalidatePath("/organization");
  revalidatePath("/dashboard");
  back(id, "message", "Group updated.");
}

export async function setMembers(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const group = await groupInCompany(session.companyId, id);
  if (!group) back("", "error", "Group not found.");
  const userIds = ids(formData, "userId");
  const users = await prisma.user.findMany({
    where: { companyId: session.companyId, id: { in: userIds } },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { groupId: id } }),
    prisma.groupMember.createMany({ data: users.map((user) => ({ groupId: id, userId: user.id })) }),
  ]);
  revalidatePath("/organization");
  revalidatePath("/dashboard");
  back(id, "message", "Members updated.");
}

export async function setOwners(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const group = await groupInCompany(session.companyId, id);
  if (!group) back("", "error", "Group not found.");
  const userIds = ids(formData, "userId");
  const users = await prisma.user.findMany({
    where: { companyId: session.companyId, id: { in: userIds }, role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.groupOwner.deleteMany({ where: { groupId: id } }),
    prisma.groupOwner.createMany({ data: users.map((user) => ({ groupId: id, userId: user.id })) }),
  ]);
  revalidatePath("/organization");
  back(id, "message", "Owners updated.");
}

export async function moveGroup(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const parentId = text(formData, "parentId");
  const group = await groupInCompany(session.companyId, id);
  if (!group) back("", "error", "Group not found.");
  const { links } = await companyLinks(session.companyId);
  if (parentId) {
    const parent = await groupInCompany(session.companyId, parentId);
    if (!parent) back(id, "error", "Parent group not found.");
    if (wouldCycle(id, parentId, links)) back(id, "error", "That parent would create a loop in the organization.");
  }
  await prisma.$transaction([
    prisma.groupLink.deleteMany({ where: { childId: id } }),
    ...(parentId ? [prisma.groupLink.create({ data: { parentId, childId: id } })] : []),
  ]);
  revalidatePath("/organization");
  back(id, "message", "Group moved.");
}

export async function deleteGroup(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const group = await groupInCompany(session.companyId, id);
  if (!group) back("", "error", "Group not found.");
  const [children, members, cycles, evaluations] = await Promise.all([
    prisma.groupLink.count({ where: { parentId: id } }),
    prisma.groupMember.count({ where: { groupId: id } }),
    prisma.cycleGroup.count({ where: { groupId: id } }),
    prisma.evaluation.count({ where: { groupId: id } }),
  ]);
  if (children > 0) back(id, "error", "Remove child groups before deleting this group.");
  if (members > 0) back(id, "error", "Remove members before deleting this group.");
  if (cycles > 0 || evaluations > 0) back(id, "error", "This group is used by an evaluation cycle.");
  await prisma.orgGroup.delete({ where: { id } });
  revalidatePath("/organization");
  redirect("/organization?message=" + encodeURIComponent("Group deleted."));
}
