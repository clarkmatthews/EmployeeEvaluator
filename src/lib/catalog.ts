import { checked, decOrNull, intOrNull, text } from "@/lib/format";

export function levelInput(formData: FormData) {
  const data: {
    p1Incl: boolean;
    p2Incl: boolean;
    p3Incl: boolean;
    p4Incl: boolean;
    p5Incl: boolean;
    p1Label: string;
    p2Label: string;
    p3Label: string;
    p4Label: string;
    p5Label: string;
    p1Score: number;
    p2Score: number;
    p3Score: number;
    p4Score: number;
    p5Score: number;
    p1Min: number | null;
    p2Min: number | null;
    p3Min: number | null;
    p4Min: number | null;
    p5Min: number | null;
  } = {
    p1Incl: checked(formData, "p1Incl"),
    p2Incl: checked(formData, "p2Incl"),
    p3Incl: checked(formData, "p3Incl"),
    p4Incl: checked(formData, "p4Incl"),
    p5Incl: checked(formData, "p5Incl"),
    p1Label: text(formData, "p1Label"),
    p2Label: text(formData, "p2Label"),
    p3Label: text(formData, "p3Label"),
    p4Label: text(formData, "p4Label"),
    p5Label: text(formData, "p5Label"),
    p1Score: intOrNull(formData, "p1Score") ?? 0,
    p2Score: intOrNull(formData, "p2Score") ?? 0,
    p3Score: intOrNull(formData, "p3Score") ?? 0,
    p4Score: intOrNull(formData, "p4Score") ?? 0,
    p5Score: intOrNull(formData, "p5Score") ?? 0,
    p1Min: decOrNull(formData, "p1Min"),
    p2Min: decOrNull(formData, "p2Min"),
    p3Min: decOrNull(formData, "p3Min"),
    p4Min: decOrNull(formData, "p4Min"),
    p5Min: decOrNull(formData, "p5Min"),
  };
  return data;
}

export const templateInclude = {
  keyItems: { include: { keyItem: true }, orderBy: { sortOrder: "asc" as const } },
  scorecardItems: { include: { scorecardItem: true }, orderBy: { sortOrder: "asc" as const } },
  accountabilityItems: { include: { accountabilityItem: true }, orderBy: { sortOrder: "asc" as const } },
  behaviorItems: { include: { behaviorItem: true }, orderBy: { sortOrder: "asc" as const } },
};
