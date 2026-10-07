"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActiveStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, setSessionCookie } from "@/lib/session";
import { text } from "@/lib/format";

const MIN_PASSWORD = 12;

function roleOf(value: string): UserRole {
  if (value === "ADMIN" || value === "MANAGER" || value === "EMPLOYEE") return value;
  return "EMPLOYEE";
}

function statusOf(value: string): ActiveStatus {
  if (value === "ACTIVE" || value === "LEAVE" || value === "INACTIVE") return value;
  return "ACTIVE";
}

export async function createPerson(formData: FormData) {
  const session = await requireAdmin();
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  if (!email || !password || !firstName || !lastName) {
    redirect("/people?error=" + encodeURIComponent("Name, email, and password are required."));
  }
  if (password.length < MIN_PASSWORD) {
    redirect("/people?error=" + encodeURIComponent("Password must be at least 12 characters."));
  }
  const existing = await prisma.user.findFirst({ where: { companyId: session.companyId, email } });
  if (existing) redirect("/people?error=" + encodeURIComponent("That email is already in use."));
  const employeeNumber = text(formData, "employeeNumber") || null;
  await prisma.user.create({
    data: {
      companyId: session.companyId,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: roleOf(text(formData, "role")),
      status: statusOf(text(formData, "status")),
      firstName,
      lastName,
      employeeNumber,
      whoType: text(formData, "whoType") || "Employee",
      jobTitle: text(formData, "jobTitle"),
      department: text(formData, "department"),
    },
  });
  revalidatePath("/people");
  revalidatePath("/dashboard");
  redirect("/people?message=" + encodeURIComponent("Person added."));
}

export async function updatePerson(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const user = await prisma.user.findFirst({ where: { id, companyId: session.companyId } });
  if (!user) redirect("/people?error=" + encodeURIComponent("Person not found."));
  const email = text(formData, "email").toLowerCase();
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  if (!email || !firstName || !lastName) {
    redirect(`/people?user=${id}&error=` + encodeURIComponent("Name and email are required."));
  }
  const clash = await prisma.user.findFirst({
    where: { companyId: session.companyId, email, NOT: { id } },
  });
  if (clash) redirect(`/people?user=${id}&error=` + encodeURIComponent("That email is already in use."));
  const password = String(formData.get("password") ?? "");
  if (password && password.length < MIN_PASSWORD) {
    redirect(`/people?user=${id}&error=` + encodeURIComponent("Password must be at least 12 characters."));
  }
  const updated = await prisma.user.update({
    where: { id },
    data: {
      email,
      firstName,
      lastName,
      role: roleOf(text(formData, "role")),
      status: statusOf(text(formData, "status")),
      employeeNumber: text(formData, "employeeNumber") || null,
      whoType: text(formData, "whoType") || "Employee",
      jobTitle: text(formData, "jobTitle"),
      department: text(formData, "department"),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } } : {}),
    },
  });
  if (password && id === session.userId) {
    await setSessionCookie(updated.id, updated.sessionVersion);
  }
  revalidatePath("/people");
  revalidatePath("/dashboard");
  redirect(`/people?user=${id}&message=` + encodeURIComponent("Person updated."));
}

export async function deletePerson(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (id === session.userId) {
    redirect("/people?error=" + encodeURIComponent("You cannot delete the account you are using."));
  }
  const user = await prisma.user.findFirst({ where: { id, companyId: session.companyId } });
  if (!user) redirect("/people?error=" + encodeURIComponent("Person not found."));
  const evaluations = await prisma.evaluation.count({
    where: { OR: [{ employeeId: id }, { reviewerId: id }] },
  });
  if (evaluations > 0) {
    redirect("/people?user=" + id + "&error=" + encodeURIComponent("This person has evaluations. Set them to inactive instead."));
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/people");
  revalidatePath("/dashboard");
  redirect("/people?message=" + encodeURIComponent("Person deleted."));
}
