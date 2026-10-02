import Link from "next/link";
import { notFound } from "next/navigation";
import { saveTemplate } from "@/actions/templates";
import { Banner, Card, PageHeader, buttonClass, inputClass, labelClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const flags: { name: string; label: string }[] = [
  { name: "inclSelfRating", label: "Employee self-rating column" },
  { name: "inclEmplInfo", label: "Employee information" },
  { name: "inclOthrJobs", label: "Other jobs" },
  { name: "inclRankDesc", label: "Rating descriptions" },
  { name: "inclInstruct", label: "Instructions" },
  { name: "inclKeysSect", label: "Key results" },
  { name: "inclScorecardSect", label: "Scorecard" },
  { name: "inclAcctSect", label: "Accountabilities" },
  { name: "inclG2GSect", label: "Behaviors" },
  { name: "inclPerfSummSect", label: "Performance summary" },
  { name: "inclSuper1CmtSect", label: "Supervisor comment 1" },
  { name: "inclSuper2CmtSect", label: "Supervisor comment 2" },
  { name: "inclSuper3CmtSect", label: "Supervisor comment 3" },
  { name: "inclMgrDutysSect", label: "Manager duty percent" },
  { name: "inclRatingsSummSect", label: "Ratings summary" },
  { name: "inclG2GGoalsSect", label: "Goals" },
  { name: "inclApprSigsSect", label: "Signatures" },
];

export default async function TemplateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const template = await prisma.appraisalTemplate.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      keyItems: true,
      scorecardItems: true,
      accountabilityItems: true,
      behaviorItems: true,
    },
  });
  if (!template) notFound();
  const [keyItems, scorecardItems, accountabilityItems, behaviorItems] = await Promise.all([
    prisma.keyItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.scorecardItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.accountabilityItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.behaviorItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
  ]);
  const selected = {
    key: new Set(template.keyItems.map((row) => row.keyItemId)),
    scorecard: new Set(template.scorecardItems.map((row) => row.scorecardItemId)),
    accountability: new Set(template.accountabilityItems.map((row) => row.accountabilityItemId)),
    behavior: new Set(template.behaviorItems.map((row) => row.behaviorItemId)),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${template.year} ${template.whoType}`}
        detail="Section points are the sum of the selected level scores. EE and ME are the cutoffs for that total."
        help="Turn sections on or off and edit the titles shown on the form. Attach the catalog items that belong in each section. The overall rating compares total points with the EE and ME minimums."
      />
      <Banner message={query.message} error={query.error} />
      <p className="text-sm"><Link className="text-indigo-700 hover:underline" href="/templates">All templates</Link> · <Link className="text-indigo-700 hover:underline" href="/catalog">Item catalog</Link></p>
      <form action={saveTemplate} className="space-y-4">
        <input type="hidden" name="id" value={template.id} />
        <Card title="Identity and thresholds">
          <div className="grid gap-3 sm:grid-cols-4">
            <label><span className={labelClass}>Year</span><input className={inputClass} name="year" type="number" defaultValue={template.year} /></label>
            <label><span className={labelClass}>Employee type</span><input className={inputClass} name="whoType" defaultValue={template.whoType} /></label>
            <label><span className={labelClass}>Exceeds minimum</span><input className={inputClass} name="eeMin" type="number" defaultValue={template.eeMin} /></label>
            <label><span className={labelClass}>Meets minimum</span><input className={inputClass} name="meMin" type="number" defaultValue={template.meMin} /></label>
          </div>
        </Card>
        <Card title="Sections">
          <div className="grid gap-2 sm:grid-cols-2">
            {flags.map((flag) => (
              <label key={flag.name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={flag.name} defaultChecked={Boolean(template[flag.name as keyof typeof template])} />
                {flag.label}
              </label>
            ))}
          </div>
        </Card>
        <Card title="Wording">
          <div className="grid gap-3">
            <Text name="formRatingsDescTitle" label="Ratings title" value={template.formRatingsDescTitle} />
            <Area name="formRatingsDesc" label="Ratings description" value={template.formRatingsDesc} />
            <Text name="formInstructTitle" label="Instructions title" value={template.formInstructTitle} />
            <Area name="formInstruct" label="Instructions" value={template.formInstruct} />
            <Text name="keysSectTitle" label="Keys title" value={template.keysSectTitle} />
            <Area name="keysSectInstruct" label="Keys instructions" value={template.keysSectInstruct} />
            <Text name="scorecardSectTitle" label="Scorecard title" value={template.scorecardSectTitle} />
            <Area name="scorecardSectInstruct" label="Scorecard instructions" value={template.scorecardSectInstruct} />
            <Text name="acctSectTitle" label="Accountabilities title" value={template.acctSectTitle} />
            <Area name="acctSectInstruct" label="Accountabilities instructions" value={template.acctSectInstruct} />
            <Text name="g2gBehaveSectTitle" label="Behaviors title" value={template.g2gBehaveSectTitle} />
            <Area name="g2gBehaveSectInstruct" label="Behaviors instructions" value={template.g2gBehaveSectInstruct} />
            <Text name="g2gBehaveSectLegend" label="Behaviors legend" value={template.g2gBehaveSectLegend} />
            <Text name="perfSummSectTitle" label="Summary title" value={template.perfSummSectTitle} />
            <Text name="superCmt1Title" label="Supervisor comment 1" value={template.superCmt1Title} />
            <Text name="superCmt2Title" label="Supervisor comment 2" value={template.superCmt2Title} />
            <Text name="superCmt3Title" label="Supervisor comment 3" value={template.superCmt3Title} />
            <Text name="mgrDutysSectTitle" label="Manager duties title" value={template.mgrDutysSectTitle} />
            <Area name="mgrDutysSectText" label="Manager duties text" value={template.mgrDutysSectText} />
            <Text name="g2gGoalsSectTitle" label="Goals title" value={template.g2gGoalsSectTitle} />
            <Area name="g2gGoalsSectInstruct" label="Goals instructions" value={template.g2gGoalsSectInstruct} />
            <Text name="signatureCompleterEmpTitle" label="Employee signature label" value={template.signatureCompleterEmpTitle} />
            <Text name="signatureCompleterSupTitle" label="Supervisor signature label" value={template.signatureCompleterSupTitle} />
            <Text name="signatureApproverTitle" label="Approver signature label" value={template.signatureApproverTitle} />
            <Text name="signatureEmployeeTitle" label="Acknowledgement label" value={template.signatureEmployeeTitle} />
          </div>
        </Card>
        <Card title="Attached items">
          <div className="grid gap-4 md:grid-cols-2">
            <CheckList title="Key results" name="keyItemId" items={keyItems} selected={selected.key} />
            <CheckList title="Scorecard" name="scorecardItemId" items={scorecardItems} selected={selected.scorecard} />
            <CheckList title="Accountabilities" name="accountabilityItemId" items={accountabilityItems} selected={selected.accountability} />
            <CheckList title="Behaviors" name="behaviorItemId" items={behaviorItems} selected={selected.behavior} />
          </div>
        </Card>
        <button className={buttonClass} type="submit">Save template</button>
      </form>
    </div>
  );
}

function Text({ name, label, value }: { name: string; label: string; value: string }) {
  return <label><span className={labelClass}>{label}</span><input className={inputClass} name={name} defaultValue={value} /></label>;
}

function Area({ name, label, value }: { name: string; label: string; value: string }) {
  return <label><span className={labelClass}>{label}</span><textarea className={inputClass} name={name} rows={3} defaultValue={value} /></label>;
}

function CheckList({ title, name, items, selected }: { title: string; name: string; items: { id: string; name: string }[]; selected: Set<string> }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{title}</legend>
      <div className="space-y-1">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={item.id} defaultChecked={selected.has(item.id)} /> {item.name}
          </label>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">None in the catalog.</p> : null}
      </div>
    </fieldset>
  );
}
