import { notFound } from "next/navigation";
import { TalentReport, talentRatingText, type TalentReportModel } from "@/components/talent-report";
import { accessibleGroupIds } from "@/lib/access";
import { ggRatingTexts } from "@/lib/gg-ratings";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function PrintTalentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const evaluation = await prisma.evaluation.findFirst({
    where: { id, cycle: { companyId: session.companyId } },
    include: {
      employee: true,
      reviewer: true,
      group: true,
      cycle: { include: { company: true } },
      talentReview: { include: { ggResponses: { include: { ggItem: true } } } },
    },
  });
  if (!evaluation?.talentReview) notFound();
  const access = await accessibleGroupIds(session);
  if (session.role !== "ADMIN" && !access.has(evaluation.groupId)) notFound();

  const [company, items, ranks, members] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: session.companyId } }),
    prisma.ggItem.findMany({ where: { companyId: session.companyId }, orderBy: { itemSeq: "asc" } }),
    prisma.talentRank.findMany({
      where: { cycleId: evaluation.cycleId, groupId: evaluation.groupId },
      include: { user: true },
    }),
    prisma.groupMember.findMany({
      where: { groupId: evaluation.groupId },
      include: { user: true },
    }),
  ]);

  return <TalentReport report={toReport(evaluation, ggRatingTexts(company), items, ranks, members)} />;
}

function toReport(
  evaluation: {
    employeeId: string;
    employee: { firstName: string; lastName: string; employeeNumber: string | null; jobTitle: string; department: string; status: string };
    reviewer: { firstName: string; lastName: string } | null;
    group: { name: string };
    cycle: { year: number; company: { name: string } };
    talentReview: {
      updatedAt: Date;
      performance: string;
      potential: string;
      perfTrend: string;
      stpAction: string;
      stpWhen: string;
      stpMove: string;
      stpBestFit: string;
      stpExplanation: string;
      ltpAction: string;
      ltpWhen: string;
      ltpMove: string;
      ltpBestFit: string;
      ltpExplanation: string;
      willingRelocate: string;
      geoPref: string;
      strength1: string;
      strength2: string;
      weakness1: string;
      weakness2: string;
      comments: string;
      questions: string;
      ggResponses: { ggItemId: string; rating: number; ggItem: { id: string; itemText: string; itemSeq: number } }[];
    } | null;
  },
  ratingTexts: readonly string[],
  items: { id: string; itemText: string; itemSeq: number }[],
  ranks: { userId: string; perfRank: number | null; potlRank: number | null; user: { firstName: string; lastName: string; status: string } }[],
  members: { userId: string; user: { firstName: string; lastName: string; status: string } }[],
): TalentReportModel {
  const review = evaluation.talentReview!;
  const saved = new Map(review.ggResponses.map((response) => [response.ggItemId, response.rating]));
  const listed = new Set(items.map((item) => item.id));
  const extra = review.ggResponses
    .filter((response) => !listed.has(response.ggItemId))
    .map((response) => response.ggItem)
    .sort((a, b) => a.itemSeq - b.itemSeq);
  const rankByUser = new Map(ranks.map((rank) => [rank.userId, rank]));
  const people = new Map(members.map((member) => [member.userId, member.user]));
  for (const rank of ranks) people.set(rank.userId, rank.user);

  return {
    companyName: evaluation.cycle.company.name,
    year: evaluation.cycle.year,
    employeeId: evaluation.employeeId,
    employeeName: personLabel(evaluation.employee),
    employeeNumber: evaluation.employee.employeeNumber ?? "",
    jobTitle: evaluation.employee.jobTitle,
    department: evaluation.employee.department,
    groupName: evaluation.group.name,
    reviewerName: evaluation.reviewer ? `${evaluation.reviewer.firstName} ${evaluation.reviewer.lastName}` : "",
    reportDate: review.updatedAt.toLocaleDateString("en-US"),
    performance: review.performance,
    potential: review.potential,
    trend: review.perfTrend,
    shortTerm: {
      action: review.stpAction,
      when: review.stpWhen,
      move: review.stpMove,
      bestFit: review.stpBestFit,
      explanation: review.stpExplanation,
    },
    longTerm: {
      action: review.ltpAction,
      when: review.ltpWhen,
      move: review.ltpMove,
      bestFit: review.ltpBestFit,
      explanation: review.ltpExplanation,
    },
    willingRelocate: review.willingRelocate,
    geoPref: review.geoPref,
    strength1: review.strength1,
    strength2: review.strength2,
    weakness1: review.weakness1,
    weakness2: review.weakness2,
    comments: review.comments,
    questions: review.questions,
    goodToGreat: [...items, ...extra].map((item) => ({
      id: item.id,
      item: item.itemText,
      rating: talentRatingText(saved.get(item.id), ratingTexts),
    })),
    ranks: [...people.entries()]
      .map(([userId, user]) => ({
        userId,
        name: personLabel(user),
        performance: rankByUser.get(userId)?.perfRank ?? null,
        potential: rankByUser.get(userId)?.potlRank ?? null,
      }))
      .sort((a, b) => (a.performance ?? 999) - (b.performance ?? 999) || a.name.localeCompare(b.name)),
  };
}

function personLabel(person: { firstName: string; lastName: string; status: string }) {
  const name = `${person.firstName} ${person.lastName}`;
  return person.status === "INACTIVE" ? `${name} (inactive)` : name;
}
