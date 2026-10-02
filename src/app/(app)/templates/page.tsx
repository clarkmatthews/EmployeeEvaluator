import Link from "next/link";
import { createTemplate } from "@/actions/templates";
import { Banner, Card, PageHeader, buttonClass, inputClass, labelClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const templates = await prisma.appraisalTemplate.findMany({
    where: { companyId: session.companyId },
    orderBy: [{ year: "desc" }, { whoType: "asc" }],
  });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Form templates"
        detail="Each performance appraisal template is one year and employee type. Attach catalog items, then set which sections appear."
        help="A template is the appraisal form for one year and employee type. Open a template to choose sections, attach catalog items, and set the point cutoffs for Exceeds expectations and Meets expectations."
      />
      <Banner message={params.message} error={params.error} />
      <Card title="Templates">
        <ul className="divide-y divide-slate-100">
          {templates.map((template) => (
            <li key={template.id} className="py-2 text-sm">
              <Link className="text-indigo-700 hover:underline" href={`/templates/${template.id}`}>{template.year} · {template.whoType}</Link>
              <span className="text-slate-500"> · EE {template.eeMin} / ME {template.meMin}</span>
            </li>
          ))}
          {templates.length === 0 ? <li className="text-sm text-slate-500">No templates yet.</li> : null}
        </ul>
        <p className="mt-3 text-sm"><Link className="text-indigo-700 hover:underline" href="/catalog">Edit the item catalog</Link></p>
      </Card>
      <Card title="New template">
        <form action={createTemplate} className="flex flex-wrap items-end gap-3">
          <label><span className={labelClass}>Year</span><input className={inputClass} name="year" type="number" defaultValue={new Date().getUTCFullYear()} required /></label>
          <label><span className={labelClass}>Employee type</span><input className={inputClass} name="whoType" defaultValue="Employee" required /></label>
          <button className={buttonClass} type="submit">Create</button>
        </form>
      </Card>
    </div>
  );
}
