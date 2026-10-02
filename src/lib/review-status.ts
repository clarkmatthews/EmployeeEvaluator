export type ReviewMark = "C" | "P" | "I";

type LevelLine = { empLevel: number | null; supLevel: number | null };

export type AppraisalStatusInput = {
  inclSelfRating: boolean;
  inclOthrJobs: boolean;
  inclKeysSect: boolean;
  inclScorecardSect: boolean;
  inclAcctSect: boolean;
  inclG2GSect: boolean;
  inclSuper1CmtSect: boolean;
  inclSuper2CmtSect: boolean;
  inclSuper3CmtSect: boolean;
  inclMgrDutysSect: boolean;
  inclG2GGoalsSect: boolean;
  inclApprSigsSect: boolean;
  keyItemIds: string[];
  scorecardItemIds: string[];
  accountabilityItemIds: string[];
  behaviorItemIds: string[];
  otherJobsNote: string;
  superComment1: string;
  superComment2: string;
  superComment3: string;
  mgrDutyPct: number | null;
  empSignature: string;
  supSignature: string;
  approverSignature: string;
  keyLines: (LevelLine & { keyItemId: string; targetAmount: number | null; achievedAmount: number | null })[];
  scorecardLines: (LevelLine & { scorecardItemId: string; numberAmount: number | null; dollarAmount: number | null })[];
  accountabilityLines: (LevelLine & { accountabilityItemId: string; text: string })[];
  behaviorLines: (LevelLine & { behaviorItemId: string })[];
  goals: { goal: string; completionDate: string }[];
};

export type TalentStatusInput = {
  performance: string;
  potential: string;
  perfTrend: string;
  stpAction: string;
  stpExplanation: string;
  stpMove: string;
  stpBestFit: string;
  stpWhen: string;
  ltpAction: string;
  ltpExplanation: string;
  ltpMove: string;
  ltpBestFit: string;
  ltpWhen: string;
  willingRelocate: string;
  geoPref: string;
  strength1: string;
  weakness1: string;
  strength2: string;
  weakness2: string;
  comments: string;
  questions: string;
  ggResponses: { ggItemId: string; rating: number }[];
};

const talentFields = [
  "performance",
  "potential",
  "perfTrend",
  "stpAction",
  "stpExplanation",
  "stpMove",
  "stpBestFit",
  "stpWhen",
  "ltpAction",
  "ltpExplanation",
  "ltpMove",
  "ltpBestFit",
  "ltpWhen",
  "willingRelocate",
  "geoPref",
  "strength1",
  "weakness1",
  "strength2",
  "weakness2",
  "comments",
  "questions",
] as const satisfies readonly (keyof TalentStatusInput)[];

export function buildAppraisalStatus(
  appraisal: {
    otherJobsNote: string;
    superComment1: string;
    superComment2: string;
    superComment3: string;
    mgrDutyPct: { toString(): string } | number | null;
    empSignature: string;
    supSignature: string;
    approverSignature: string;
    keyLines: { keyItemId: string; targetAmount: { toString(): string } | number | null; achievedAmount: { toString(): string } | number | null; empLevel: number | null; supLevel: number | null }[];
    scorecardLines: { scorecardItemId: string; numberAmount: { toString(): string } | number | null; dollarAmount: { toString(): string } | number | null; empLevel: number | null; supLevel: number | null }[];
    accountabilityLines: { accountabilityItemId: string; text: string; empLevel: number | null; supLevel: number | null }[];
    behaviorLines: { behaviorItemId: string; empLevel: number | null; supLevel: number | null }[];
    goals: { goal: string; completionDate: Date | string | null }[];
  },
  template: {
    inclSelfRating: boolean;
    inclOthrJobs: boolean;
    inclKeysSect: boolean;
    inclScorecardSect: boolean;
    inclAcctSect: boolean;
    inclG2GSect: boolean;
    inclSuper1CmtSect: boolean;
    inclSuper2CmtSect: boolean;
    inclSuper3CmtSect: boolean;
    inclMgrDutysSect: boolean;
    inclG2GGoalsSect: boolean;
    inclApprSigsSect: boolean;
    keyItems: { keyItemId: string }[];
    scorecardItems: { scorecardItemId: string }[];
    accountabilityItems: { accountabilityItemId: string }[];
    behaviorItems: { behaviorItemId: string }[];
  },
): AppraisalStatusInput {
  return {
    inclSelfRating: template.inclSelfRating,
    inclOthrJobs: template.inclOthrJobs,
    inclKeysSect: template.inclKeysSect,
    inclScorecardSect: template.inclScorecardSect,
    inclAcctSect: template.inclAcctSect,
    inclG2GSect: template.inclG2GSect,
    inclSuper1CmtSect: template.inclSuper1CmtSect,
    inclSuper2CmtSect: template.inclSuper2CmtSect,
    inclSuper3CmtSect: template.inclSuper3CmtSect,
    inclMgrDutysSect: template.inclMgrDutysSect,
    inclG2GGoalsSect: template.inclG2GGoalsSect,
    inclApprSigsSect: template.inclApprSigsSect,
    keyItemIds: template.keyItems.map((row) => row.keyItemId),
    scorecardItemIds: template.scorecardItems.map((row) => row.scorecardItemId),
    accountabilityItemIds: template.accountabilityItems.map((row) => row.accountabilityItemId),
    behaviorItemIds: template.behaviorItems.map((row) => row.behaviorItemId),
    otherJobsNote: appraisal.otherJobsNote,
    superComment1: appraisal.superComment1,
    superComment2: appraisal.superComment2,
    superComment3: appraisal.superComment3,
    mgrDutyPct: amountOf(appraisal.mgrDutyPct),
    empSignature: appraisal.empSignature,
    supSignature: appraisal.supSignature,
    approverSignature: appraisal.approverSignature,
    keyLines: appraisal.keyLines.map((line) => ({
      keyItemId: line.keyItemId,
      targetAmount: amountOf(line.targetAmount),
      achievedAmount: amountOf(line.achievedAmount),
      empLevel: line.empLevel,
      supLevel: line.supLevel,
    })),
    scorecardLines: appraisal.scorecardLines.map((line) => ({
      scorecardItemId: line.scorecardItemId,
      numberAmount: amountOf(line.numberAmount),
      dollarAmount: amountOf(line.dollarAmount),
      empLevel: line.empLevel,
      supLevel: line.supLevel,
    })),
    accountabilityLines: appraisal.accountabilityLines,
    behaviorLines: appraisal.behaviorLines,
    goals: appraisal.goals.map((goal) => ({
      goal: goal.goal,
      completionDate: goal.completionDate instanceof Date ? goal.completionDate.toISOString().slice(0, 10) : goal.completionDate ?? "",
    })),
  };
}

export function appraisalMark(appraisal: AppraisalStatusInput | null): ReviewMark {
  if (!appraisal) return "I";
  return appraisalComplete(appraisal) ? "C" : "P";
}

export function talentMark(review: TalentStatusInput | null, ggItemIds: string[]): ReviewMark {
  if (!review) return "I";
  const textFilled = talentFields.every((field) => hasText(review[field]));
  const ratingsFilled = ggItemIds.every((id) => {
    const rating = review.ggResponses.find((response) => response.ggItemId === id)?.rating;
    return rating != null && rating >= 1 && rating <= 5;
  });
  return textFilled && ratingsFilled ? "C" : "P";
}

function appraisalComplete(appraisal: AppraisalStatusInput) {
  const selfRating = appraisal.inclSelfRating;
  if (appraisal.inclKeysSect) {
    for (const id of appraisal.keyItemIds) {
      const line = appraisal.keyLines.find((item) => item.keyItemId === id);
      if (!line || !hasAmount(line.targetAmount) || !hasAmount(line.achievedAmount) || !levelsFilled(line, selfRating)) return false;
    }
  }
  if (appraisal.inclScorecardSect) {
    for (const id of appraisal.scorecardItemIds) {
      const line = appraisal.scorecardLines.find((item) => item.scorecardItemId === id);
      if (!line || !hasAmount(line.numberAmount) || !hasAmount(line.dollarAmount) || !levelsFilled(line, selfRating)) return false;
    }
  }
  if (appraisal.inclAcctSect) {
    for (const id of appraisal.accountabilityItemIds) {
      const line = appraisal.accountabilityLines.find((item) => item.accountabilityItemId === id);
      if (!line || !hasText(line.text) || !levelsFilled(line, selfRating)) return false;
    }
  }
  if (appraisal.inclG2GSect) {
    for (const id of appraisal.behaviorItemIds) {
      const line = appraisal.behaviorLines.find((item) => item.behaviorItemId === id);
      if (!line || !levelsFilled(line, selfRating)) return false;
    }
  }
  if (appraisal.inclMgrDutysSect && !(appraisal.mgrDutyPct != null && appraisal.mgrDutyPct > 0)) return false;
  if (appraisal.inclG2GGoalsSect) {
    if (appraisal.goals.length === 0) return false;
    if (appraisal.goals.some((goal) => !hasText(goal.goal) || !hasText(goal.completionDate))) return false;
  }
  if (appraisal.inclOthrJobs && !hasText(appraisal.otherJobsNote)) return false;
  if (appraisal.inclSuper1CmtSect && !hasText(appraisal.superComment1)) return false;
  if (appraisal.inclSuper2CmtSect && !hasText(appraisal.superComment2)) return false;
  if (appraisal.inclSuper3CmtSect && !hasText(appraisal.superComment3)) return false;
  if (appraisal.inclApprSigsSect && (!hasText(appraisal.empSignature) || !hasText(appraisal.supSignature) || !hasText(appraisal.approverSignature))) return false;
  return true;
}

function levelsFilled(line: LevelLine, selfRating: boolean) {
  if (line.supLevel == null || line.supLevel < 1 || line.supLevel > 5) return false;
  if (!selfRating) return true;
  return line.empLevel != null && line.empLevel >= 1 && line.empLevel <= 5;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasAmount(value: number | null | undefined) {
  return value != null && Number.isFinite(value);
}

function amountOf(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
