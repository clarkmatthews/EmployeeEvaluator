import { notFound } from "next/navigation";
import { TalentMatrixReport } from "@/components/talent-matrix";
import { isMatrixView, loadTalentMatrix } from "@/lib/talent-matrix";
import { requireUser } from "@/lib/session";

export default async function TalentMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string; groupId?: string; view?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  if (!params.cycleId || !params.groupId || !params.view || !isMatrixView(params.view)) notFound();
  const report = await loadTalentMatrix(session, params.cycleId, params.groupId, params.view);
  if (!report) notFound();
  return <TalentMatrixReport {...report} />;
}
