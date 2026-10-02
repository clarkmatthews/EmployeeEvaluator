import type { Prisma } from "@prisma/client";
import { levelsOf, overallRating, pointsFor, type LevelSource, type SessionUser } from "@/lib/scoring";
import { accessibleGroupIds } from "@/lib/access";

export function fillYear(text: string, year: number) {
  return text.replaceAll("%Y1%", String(year + 1)).replaceAll("%Y%", String(year));
}

export function maxPoints(levels: { included: boolean; score: number }[]) {
  return levels.filter((level) => level.included).reduce((highest, level) => Math.max(highest, level.score), 0);
}

export type ReportLevel = {
  level: number;
  included: boolean;
  score: number;
  label: string;
};

export type RatedLine = {
  id: string;
  name: string;
  text: string;
  metrics: { label: string; value: string }[];
  empLevel: number | null;
  supLevel: number | null;
  empPoints: number;
  supPoints: number;
  empComment: string;
  supComment: string;
  levels: ReportLevel[];
};

export function ratedLine(
  item: LevelSource & { name: string },
  input: {
    id: string;
    text?: string;
    metrics?: { label: string; value: string }[];
    empLevel: number | null;
    supLevel: number | null;
    empComment?: string;
    supComment?: string;
  },
): RatedLine {
  const levels = levelsOf(item).map((level) => ({
    level: level.level,
    included: level.included,
    score: level.score,
    label: level.label,
  }));
  return {
    id: input.id,
    name: item.name,
    text: input.text ?? "",
    metrics: input.metrics ?? [],
    empLevel: input.empLevel,
    supLevel: input.supLevel,
    empPoints: pointsFor(levelsOf(item), input.empLevel),
    supPoints: pointsFor(levelsOf(item), input.supLevel),
    empComment: input.empComment ?? "",
    supComment: input.supComment ?? "",
    levels,
  };
}

export function lineTotals(lines: RatedLine[]) {
  return lines.reduce(
    (totals, line) => ({
      emp: totals.emp + line.empPoints,
      sup: totals.sup + line.supPoints,
      max: totals.max + maxPoints(line.levels),
    }),
    { emp: 0, sup: 0, max: 0 },
  );
}

export function ratingMark(points: number, eeMin: number, meMin: number) {
  return overallRating(points, eeMin, meMin);
}

export async function visibleEvaluationsWhere(session: SessionUser): Promise<Prisma.EvaluationWhereInput> {
  const company = { cycle: { companyId: session.companyId } };
  if (session.role === "ADMIN") return company;
  if (session.role === "MANAGER") {
    const groups = [...(await accessibleGroupIds(session))];
    return { ...company, OR: [{ groupId: { in: groups } }, { employeeId: session.userId }] };
  }
  return { ...company, employeeId: session.userId };
}

export function amount(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
