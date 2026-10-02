"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { text } from "@/lib/format";

export async function importKeyValues(formData: FormData) {
  const session = await requireAdmin();
  const cycleId = text(formData, "cycleId");
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId: session.companyId, formKind: { name: "PA" } },
  });
  if (!cycle) redirect("/import?error=" + encodeURIComponent("Choose a performance appraisal cycle."));
  const raw = String(formData.get("rows") ?? "");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed: { employeeNumber: string; itemName: string; sortOrder: number; value: number }[] = [];
  for (const line of lines) {
    if (line.toLowerCase().startsWith("employeenumber")) continue;
    const [employeeNumber, itemName, orderRaw, valueRaw] = line.split("\t").map((part) => part.trim());
    const sortOrder = Number(orderRaw);
    const value = Number(valueRaw);
    if (!employeeNumber || !itemName || !Number.isFinite(sortOrder) || !Number.isFinite(value)) {
      redirect("/import?error=" + encodeURIComponent(`Could not read this row: ${line}`));
    }
    parsed.push({ employeeNumber, itemName, sortOrder, value });
  }
  if (parsed.length === 0) redirect("/import?error=" + encodeURIComponent("Paste at least one row."));

  const users = await prisma.user.findMany({ where: { companyId: session.companyId } });
  const items = await prisma.keyItem.findMany({ where: { companyId: session.companyId } });
  const byEmployee = new Map(users.filter((user) => user.employeeNumber).map((user) => [user.employeeNumber as string, user]));
  const byItem = new Map(items.map((item) => [item.name.toLowerCase(), item]));
  const rows = [];
  for (const row of parsed) {
    const user = byEmployee.get(row.employeeNumber);
    const item = byItem.get(row.itemName.toLowerCase());
    if (!user) redirect("/import?error=" + encodeURIComponent(`No employee number ${row.employeeNumber}.`));
    if (!item) redirect("/import?error=" + encodeURIComponent(`No key item named ${row.itemName}.`));
    rows.push({ userId: user!.id, keyItemId: item!.id, sortOrder: row.sortOrder, value: row.value });
  }
  const userIds = [...new Set(rows.map((row) => row.userId))];
  await prisma.$transaction([
    prisma.keyItemValue.deleteMany({ where: { cycleId, userId: { in: userIds } } }),
    prisma.keyItemValue.createMany({
      data: rows.map((row) => ({ cycleId, ...row })),
    }),
  ]);
  revalidatePath("/import");
  revalidatePath("/appraisals");
  revalidatePath("/dashboard");
  redirect("/import?message=" + encodeURIComponent(`Imported ${rows.length} values.`));
}
