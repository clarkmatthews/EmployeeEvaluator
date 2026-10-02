import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { accessibleGroupIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function PrintTalentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const evaluation = await prisma.evaluation.findFirst({
    where: { id, cycle: { companyId: session.companyId } },
    include: {
      employee: true,
      group: true,
      cycle: true,
      talentReview: { include: { ggResponses: { include: { ggItem: true } } } },
    },
  });
  if (!evaluation?.talentReview) notFound();
  const access = await accessibleGroupIds(session);
  if (session.role !== "ADMIN" && !access.has(evaluation.groupId)) notFound();
  const review = evaluation.talentReview;
  const ranks = await prisma.talentRank.findMany({
    where: { cycleId: evaluation.cycleId, groupId: evaluation.groupId },
    include: { user: true },
  });
  return (
    <article className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500">Talent review</p>
          <h1 className="text-2xl font-semibold">{evaluation.employee.firstName} {evaluation.employee.lastName}</h1>
          <p>{evaluation.cycle.year} · {evaluation.group.name}</p>
        </div>
        <PrintButton />
      </div>
      <p>Performance {review.performance} · Potential {review.potential} · Trend {review.perfTrend}</p>
      <p>Short-term {review.stpAction} {review.stpWhen}. {review.stpExplanation}</p>
      <p>Long-term {review.ltpAction} {review.ltpWhen}. {review.ltpExplanation}</p>
      <p>Relocate: {review.willingRelocate}. Geography: {review.geoPref}</p>
      <p>Strengths: {review.strength1}; {review.strength2}</p>
      <p>Development: {review.weakness1}; {review.weakness2}</p>
      <h2 className="font-semibold">Good to Great</h2>
      <ul>{review.ggResponses.map((response) => <li key={response.id}>{response.ggItem.itemText}: {response.rating}</li>)}</ul>
      <p>{review.comments}</p>
      <h2 className="font-semibold">Group ranks</h2>
      <ul>
        {ranks.sort((a, b) => (a.perfRank ?? 99) - (b.perfRank ?? 99)).map((rank) => (
          <li key={rank.id}>{rank.user.firstName} {rank.user.lastName}: performance {rank.perfRank ?? "—"}, potential {rank.potlRank ?? "—"}</li>
        ))}
      </ul>
      <p className="print:hidden"><Link className="text-indigo-700" href="/talent">Back</Link></p>
    </article>
  );
}
