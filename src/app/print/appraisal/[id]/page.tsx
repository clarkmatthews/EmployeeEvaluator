import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { AppraisalReport, type AppraisalReportModel } from "@/components/appraisal-report";
import { amount, ratedLine, visibleEvaluationsWhere } from "@/lib/appraisal-report";
import { dateInput, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { variancePercent } from "@/lib/scoring";
import { requireUser } from "@/lib/session";

const reportInclude = {
  employee: true,
  reviewer: true,
  group: true,
  cycle: { include: { company: true } },
  appraisal: {
    include: {
      template: true,
      keyLines: { include: { keyItem: true } },
      scorecardLines: { include: { scorecardItem: true } },
      accountabilityLines: { include: { accountabilityItem: true } },
      behaviorLines: { include: { behaviorItem: true } },
      goals: { orderBy: { goalNumber: "asc" as const } },
    },
  },
} satisfies Prisma.EvaluationInclude;

function loadPrintEvaluation(where: Prisma.EvaluationWhereInput) {
  return prisma.evaluation.findFirst({
    where,
    include: reportInclude,
  });
}

type ReportEvaluation = NonNullable<Awaited<ReturnType<typeof loadPrintEvaluation>>>;

export default async function PrintAppraisalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const evaluation = await loadPrintEvaluation({
    id,
    ...(await visibleEvaluationsWhere(session)),
    appraisal: { isNot: null },
  });
  if (!evaluation?.appraisal) notFound();
  return <AppraisalReport report={toReport(evaluation)} />;
}

function toReport(evaluation: ReportEvaluation): AppraisalReportModel {
  const appraisal = evaluation.appraisal!;
  const template = appraisal.template;
  const year = evaluation.cycle.year;
  return {
    year,
    companyName: evaluation.cycle.company.name,
    employeeName: `${evaluation.employee.firstName} ${evaluation.employee.lastName}`,
    reviewerName: evaluation.reviewer ? `${evaluation.reviewer.firstName} ${evaluation.reviewer.lastName}` : "",
    groupName: evaluation.group.name,
    jobTitle: evaluation.employee.jobTitle,
    department: evaluation.employee.department,
    employeeNumber: evaluation.employee.employeeNumber ?? "",
    reportDate: appraisal.updatedAt.toLocaleDateString("en-US", { timeZone: "UTC" }),
    showSelf: template.inclSelfRating,
    eeMin: template.eeMin,
    meMin: template.meMin,
    otherJobsNote: appraisal.otherJobsNote,
    mgrDutyPct: num(appraisal.mgrDutyPct),
    goals: appraisal.goals.map((goal) => ({ goal: goal.goal, completionDate: dateInput(goal.completionDate) })),
    comments: {
      super1: appraisal.superComment1,
      super2: appraisal.superComment2,
      super3: appraisal.superComment3,
      emp: appraisal.empComment,
    },
    signatures: {
      emp: appraisal.empSignature,
      sup: appraisal.supSignature,
      approver: appraisal.approverSignature,
    },
    keys: sortBy(appraisal.keyLines, (line) => line.keyItem).map((line) => {
      const target = num(line.targetAmount);
      const achieved = num(line.achievedAmount);
      const variance = variancePercent(achieved ?? Number.NaN, target ?? Number.NaN);
      return ratedLine(line.keyItem, {
        id: line.id,
        empLevel: line.empLevel,
        supLevel: line.supLevel,
        empComment: line.empComment,
        supComment: line.supComment,
        metrics: [
          { label: "Target", value: amount(target) },
          { label: "Achieved", value: amount(achieved) },
          { label: "Versus target", value: variance == null ? "—" : `${variance.toFixed(1)}%` },
        ],
      });
    }),
    scorecards: sortBy(appraisal.scorecardLines, (line) => line.scorecardItem).map((line) => {
      const count = num(line.numberAmount);
      const dollars = num(line.dollarAmount);
      const ratio = count ? (dollars ?? 0) / count : null;
      return ratedLine(line.scorecardItem, {
        id: line.id,
        empLevel: line.empLevel,
        supLevel: line.supLevel,
        empComment: line.empComment,
        supComment: line.supComment,
        metrics: [
          { label: "Count", value: amount(count) },
          { label: "Dollars", value: amount(dollars) },
          { label: "Ratio", value: ratio == null ? "—" : ratio.toFixed(2) },
        ],
      });
    }),
    accountabilities: sortBy(appraisal.accountabilityLines, (line) => line.accountabilityItem).map((line) =>
      ratedLine(line.accountabilityItem, {
        id: line.id,
        text: line.text,
        empLevel: line.empLevel,
        supLevel: line.supLevel,
        empComment: line.empComment,
        supComment: line.supComment,
      }),
    ),
    behaviors: sortBy(appraisal.behaviorLines, (line) => line.behaviorItem).map((line) =>
      ratedLine(line.behaviorItem, {
        id: line.id,
        empLevel: line.empLevel,
        supLevel: line.supLevel,
        empComment: line.empComment,
        supComment: line.supComment,
      }),
    ),
    template: {
      inclEmplInfo: template.inclEmplInfo,
      inclOthrJobs: template.inclOthrJobs,
      inclRankDesc: template.inclRankDesc,
      inclInstruct: template.inclInstruct,
      inclKeysSect: template.inclKeysSect,
      inclScorecardSect: template.inclScorecardSect,
      inclAcctSect: template.inclAcctSect,
      inclG2GSect: template.inclG2GSect,
      inclPerfSummSect: template.inclPerfSummSect,
      inclSuper1CmtSect: template.inclSuper1CmtSect,
      inclSuper2CmtSect: template.inclSuper2CmtSect,
      inclSuper3CmtSect: template.inclSuper3CmtSect,
      inclMgrDutysSect: template.inclMgrDutysSect,
      inclRatingsSummSect: template.inclRatingsSummSect,
      inclG2GGoalsSect: template.inclG2GGoalsSect,
      inclApprSigsSect: template.inclApprSigsSect,
      formRatingsDescTitle: template.formRatingsDescTitle,
      formRatingsDesc: template.formRatingsDesc,
      formInstructTitle: template.formInstructTitle,
      formInstruct: template.formInstruct,
      keysSectTitle: template.keysSectTitle,
      keysSectInstruct: template.keysSectInstruct,
      scorecardSectTitle: template.scorecardSectTitle,
      scorecardSectInstruct: template.scorecardSectInstruct,
      acctSectTitle: template.acctSectTitle,
      acctSectInstruct: template.acctSectInstruct,
      g2gBehaveSectTitle: template.g2gBehaveSectTitle,
      g2gBehaveSectInstruct: template.g2gBehaveSectInstruct,
      g2gBehaveSectLegend: template.g2gBehaveSectLegend,
      perfSummSectTitle: template.perfSummSectTitle,
      superCmt1Title: template.superCmt1Title,
      superCmt2Title: template.superCmt2Title,
      superCmt3Title: template.superCmt3Title,
      mgrDutysSectTitle: template.mgrDutysSectTitle,
      mgrDutysSectText: template.mgrDutysSectText,
      g2gGoalsSectTitle: template.g2gGoalsSectTitle,
      g2gGoalsSectInstruct: template.g2gGoalsSectInstruct,
      signatureCompleterSupTitle: template.signatureCompleterSupTitle,
      signatureApproverTitle: template.signatureApproverTitle,
      signatureEmployeeTitle: template.signatureEmployeeTitle,
    },
  };
}

function sortBy<T>(rows: T[], item: (row: T) => { sortOrder: number; name: string }) {
  return [...rows].sort((left, right) => item(left).sortOrder - item(right).sortOrder || item(left).name.localeCompare(item(right).name));
}
