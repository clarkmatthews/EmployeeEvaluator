export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type SessionUser = {
  userId: string;
  companyId: string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
};

export type Level = {
  level: number;
  included: boolean;
  score: number;
  min: number | null;
  label: string;
};

export type LevelSource = {
  p1Incl: boolean;
  p2Incl: boolean;
  p3Incl: boolean;
  p4Incl: boolean;
  p5Incl: boolean;
  p1Score: number;
  p2Score: number;
  p3Score: number;
  p4Score: number;
  p5Score: number;
  p1Min?: { toString(): string } | number | null;
  p2Min?: { toString(): string } | number | null;
  p3Min?: { toString(): string } | number | null;
  p4Min?: { toString(): string } | number | null;
  p5Min?: { toString(): string } | number | null;
  p1Label: string;
  p2Label: string;
  p3Label: string;
  p4Label: string;
  p5Label: string;
};

export function levelsOf(item: LevelSource): Level[] {
  return [1, 2, 3, 4, 5].map((level) => {
    const min = item[`p${level}Min` as keyof LevelSource];
    return {
      level,
      included: Boolean(item[`p${level}Incl` as keyof LevelSource]),
      score: Number(item[`p${level}Score` as keyof LevelSource]),
      min: min == null || min === "" ? null : Number(min),
      label: String(item[`p${level}Label` as keyof LevelSource] ?? ""),
    };
  });
}

export function variancePercent(achieved: number, target: number): number | null {
  if (!Number.isFinite(achieved) || !Number.isFinite(target) || target === 0) return null;
  return (100 * achieved) / target - 100;
}

export function levelForValue(levels: Level[], value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const ranked = levels
    .filter((level) => level.included && level.min != null)
    .sort((a, b) => b.level - a.level);
  for (const level of ranked) {
    if (value >= (level.min as number)) return level.level;
  }
  const fallback = levels.filter((level) => level.included).sort((a, b) => a.level - b.level)[0];
  return fallback?.level ?? null;
}

export function pointsFor(levels: Level[], selected: number | null): number {
  if (selected == null) return 0;
  return levels.find((level) => level.level === selected)?.score ?? 0;
}

export function overallRating(points: number, eeMin: number, meMin: number): "ee" | "me" | "ni" {
  if (points >= eeMin) return "ee";
  if (points >= meMin) return "me";
  return "ni";
}

export const RATING_LABEL = {
  ee: "Exceeds expectations",
  me: "Meets expectations",
  ni: "Needs improvement",
} as const;

export function scoreKeyLevel(item: LevelSource, target: number | null, achieved: number | null): number | null {
  if (target == null || achieved == null) return null;
  return levelForValue(levelsOf(item), variancePercent(achieved, target));
}

export function scoreRatioLevel(item: LevelSource, count: number | null, dollars: number | null): number | null {
  if (count == null || dollars == null || count === 0) return null;
  return levelForValue(levelsOf(item), dollars / count);
}
