import { importKeyValues } from "@/actions/import";
import { Banner, Card, PageHeader, buttonClass, inputClass, labelClass } from "@/components/ui";
import { formKindLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const cycles = await prisma.cycle.findMany({
    where: { companyId: session.companyId, formKind: { name: "PA" } },
    include: { formKind: true },
    orderBy: { year: "desc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Key value import"
        detail="Paste tab-separated rows. Order 1 becomes the target and order 2 the achieved amount when the appraisal does not already have amounts."
        help="Each row is an employee number, a key item name, an order, and a value, separated by tabs. Order 1 is the target and order 2 is the achieved amount. Imported amounts fill an appraisal that does not already have those amounts."
      />
      <Banner message={params.message} error={params.error} />
      <Card>
        <form action={importKeyValues} className="space-y-3">
          <label>
            <span className={labelClass}>Performance appraisal cycle</span>
            <select className={inputClass} name="cycleId" required>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.year} {formKindLabel(cycle.formKind.name)}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Rows</span>
            <textarea
              className={`${inputClass} font-mono`}
              name="rows"
              rows={8}
              placeholder={"employeeNumber\tkey item name\torder\tvalue\nE200\tSales vs target\t1\t100\nE200\tSales vs target\t2\t110"}
            />
          </label>
          <button className={buttonClass} type="submit">Import</button>
        </form>
      </Card>
    </div>
  );
}
