"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { checked, intOrNull, text } from "@/lib/format";
import { levelInput } from "@/lib/catalog";

const templateFields = [
  "inclSelfRating",
  "inclEmplInfo",
  "inclOthrJobs",
  "inclRankDesc",
  "inclInstruct",
  "inclKeysSect",
  "inclScorecardSect",
  "inclAcctSect",
  "inclG2GSect",
  "inclPerfSummSect",
  "inclSuper1CmtSect",
  "inclSuper2CmtSect",
  "inclSuper3CmtSect",
  "inclMgrDutysSect",
  "inclRatingsSummSect",
  "inclG2GGoalsSect",
  "inclApprSigsSect",
] as const;

const textFields = [
  "formRatingsDescTitle",
  "formRatingsDesc",
  "formInstructTitle",
  "formInstruct",
  "keysSectTitle",
  "keysSectInstruct",
  "scorecardSectTitle",
  "scorecardSectInstruct",
  "acctSectTitle",
  "acctSectInstruct",
  "g2gBehaveSectTitle",
  "g2gBehaveSectInstruct",
  "g2gBehaveSectLegend",
  "perfSummSectTitle",
  "superCmt1Title",
  "superCmt2Title",
  "superCmt3Title",
  "mgrDutysSectTitle",
  "mgrDutysSectText",
  "g2gGoalsSectTitle",
  "g2gGoalsSectInstruct",
  "signatureCompleterEmpTitle",
  "signatureCompleterSupTitle",
  "signatureApproverTitle",
  "signatureEmployeeTitle",
] as const;

function editor(id: string, kind: "message" | "error", message: string): never {
  redirect(`/templates/${id}?${kind}=` + encodeURIComponent(message));
}

export async function createTemplate(formData: FormData) {
  const session = await requireAdmin();
  const year = Number(text(formData, "year"));
  const whoType = text(formData, "whoType") || "Employee";
  const formKind = await prisma.formKind.findFirst({ where: { companyId: session.companyId, name: "PA" } });
  if (!formKind || !year) redirect("/templates?error=" + encodeURIComponent("Year is required."));
  const existing = await prisma.appraisalTemplate.findFirst({
    where: { companyId: session.companyId, year, formKindId: formKind.id, whoType },
  });
  if (existing) redirect(`/templates/${existing.id}?message=` + encodeURIComponent("That template already exists."));
  const template = await prisma.appraisalTemplate.create({
    data: { companyId: session.companyId, year, formKindId: formKind.id, whoType },
  });
  revalidatePath("/templates");
  redirect(`/templates/${template.id}?message=` + encodeURIComponent("Template created."));
}

export async function saveTemplate(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const template = await prisma.appraisalTemplate.findFirst({ where: { id, companyId: session.companyId } });
  if (!template) redirect("/templates?error=" + encodeURIComponent("Template not found."));
  const year = Number(text(formData, "year"));
  const whoType = text(formData, "whoType") || "Employee";
  const eeMin = intOrNull(formData, "eeMin") ?? 80;
  const meMin = intOrNull(formData, "meMin") ?? 51;
  if (meMin > eeMin) editor(id, "error", "The meets minimum must be less than or equal to the exceeds minimum.");
  const flags = Object.fromEntries(templateFields.map((field) => [field, checked(formData, field)]));
  const texts = Object.fromEntries(textFields.map((field) => [field, text(formData, field)]));
  try {
    await prisma.appraisalTemplate.update({
      where: { id },
      data: { year, whoType, eeMin, meMin, ...flags, ...texts },
    });
  } catch {
    editor(id, "error", "Another template already uses that year and employee type.");
  }
  const keyIds = formData.getAll("keyItemId").map(String);
  const scorecardIds = formData.getAll("scorecardItemId").map(String);
  const accountabilityIds = formData.getAll("accountabilityItemId").map(String);
  const behaviorIds = formData.getAll("behaviorItemId").map(String);
  await prisma.$transaction([
    prisma.templateKeyItem.deleteMany({ where: { templateId: id } }),
    prisma.templateScorecardItem.deleteMany({ where: { templateId: id } }),
    prisma.templateAccountabilityItem.deleteMany({ where: { templateId: id } }),
    prisma.templateBehaviorItem.deleteMany({ where: { templateId: id } }),
    prisma.templateKeyItem.createMany({
      data: keyIds.map((keyItemId, sortOrder) => ({ templateId: id, keyItemId, sortOrder })),
    }),
    prisma.templateScorecardItem.createMany({
      data: scorecardIds.map((scorecardItemId, sortOrder) => ({ templateId: id, scorecardItemId, sortOrder })),
    }),
    prisma.templateAccountabilityItem.createMany({
      data: accountabilityIds.map((accountabilityItemId, sortOrder) => ({ templateId: id, accountabilityItemId, sortOrder })),
    }),
    prisma.templateBehaviorItem.createMany({
      data: behaviorIds.map((behaviorItemId, sortOrder) => ({ templateId: id, behaviorItemId, sortOrder })),
    }),
  ]);
  revalidatePath(`/templates/${id}`);
  editor(id, "message", "Template saved.");
}

export async function createKeyItem(formData: FormData) {
  const session = await requireAdmin();
  const name = text(formData, "name");
  if (!name) redirect("/catalog?error=" + encodeURIComponent("Key item name is required."));
  await prisma.keyItem.create({ data: { companyId: session.companyId, name, sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) } });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Key item added."));
}

export async function updateKeyItem(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const item = await prisma.keyItem.findFirst({ where: { id, companyId: session.companyId } });
  if (!item) redirect("/catalog?error=" + encodeURIComponent("Key item not found."));
  await prisma.keyItem.update({
    where: { id },
    data: { name: text(formData, "name"), sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) },
  });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Key item updated."));
}

export async function createScorecardItem(formData: FormData) {
  const session = await requireAdmin();
  const name = text(formData, "name");
  if (!name) redirect("/catalog?error=" + encodeURIComponent("Scorecard item name is required."));
  await prisma.scorecardItem.create({ data: { companyId: session.companyId, name, sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) } });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Scorecard item added."));
}

export async function updateScorecardItem(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const item = await prisma.scorecardItem.findFirst({ where: { id, companyId: session.companyId } });
  if (!item) redirect("/catalog?error=" + encodeURIComponent("Scorecard item not found."));
  await prisma.scorecardItem.update({
    where: { id },
    data: { name: text(formData, "name"), sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) },
  });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Scorecard item updated."));
}

export async function createAccountabilityItem(formData: FormData) {
  const session = await requireAdmin();
  const name = text(formData, "name");
  if (!name) redirect("/catalog?error=" + encodeURIComponent("Accountability name is required."));
  await prisma.accountabilityItem.create({ data: { companyId: session.companyId, name, sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) } });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Accountability added."));
}

export async function updateAccountabilityItem(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const item = await prisma.accountabilityItem.findFirst({ where: { id, companyId: session.companyId } });
  if (!item) redirect("/catalog?error=" + encodeURIComponent("Accountability not found."));
  await prisma.accountabilityItem.update({
    where: { id },
    data: { name: text(formData, "name"), sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) },
  });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Accountability updated."));
}

export async function createBehaviorItem(formData: FormData) {
  const session = await requireAdmin();
  const name = text(formData, "name");
  if (!name) redirect("/catalog?error=" + encodeURIComponent("Behavior name is required."));
  await prisma.behaviorItem.create({ data: { companyId: session.companyId, name, sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) } });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Behavior added."));
}

export async function updateBehaviorItem(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const item = await prisma.behaviorItem.findFirst({ where: { id, companyId: session.companyId } });
  if (!item) redirect("/catalog?error=" + encodeURIComponent("Behavior not found."));
  await prisma.behaviorItem.update({
    where: { id },
    data: { name: text(formData, "name"), sortOrder: intOrNull(formData, "sortOrder") ?? 0, ...levelInput(formData) },
  });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Behavior updated."));
}

export async function createGgItem(formData: FormData) {
  const session = await requireAdmin();
  const itemText = text(formData, "itemText");
  const itemSeq = intOrNull(formData, "itemSeq");
  if (!itemText || !itemSeq) redirect("/catalog?error=" + encodeURIComponent("Sequence and text are required."));
  await prisma.ggItem.create({
    data: { companyId: session.companyId, itemSeq, itemText, helpText: text(formData, "helpText") },
  });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Talent item added."));
}

export async function updateGgItem(formData: FormData) {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const item = await prisma.ggItem.findFirst({ where: { id, companyId: session.companyId } });
  if (!item) redirect("/catalog?error=" + encodeURIComponent("Talent item not found."));
  await prisma.ggItem.update({
    where: { id },
    data: { itemSeq: intOrNull(formData, "itemSeq") ?? item.itemSeq, itemText: text(formData, "itemText"), helpText: text(formData, "helpText") },
  });
  revalidatePath("/catalog");
  redirect("/catalog?message=" + encodeURIComponent("Talent item updated."));
}
