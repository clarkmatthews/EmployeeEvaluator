import {
  createAccountabilityItem,
  createBehaviorItem,
  createGgItem,
  createKeyItem,
  createScorecardItem,
  updateAccountabilityItem,
  updateBehaviorItem,
  updateGgItem,
  updateGgRatings,
  updateKeyItem,
  updateScorecardItem,
} from "@/actions/templates";
import { LevelFields } from "@/components/level-fields";
import { Banner, Card, PageHeader, buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import { ggRatingTexts } from "@/lib/gg-ratings";
import type { LevelSource } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const [keys, scorecards, accountabilities, behaviors, ggItems, company] = await Promise.all([
    prisma.keyItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.scorecardItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.accountabilityItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.behaviorItem.findMany({ where: { companyId: session.companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.ggItem.findMany({ where: { companyId: session.companyId }, orderBy: { itemSeq: "asc" } }),
    prisma.company.findUniqueOrThrow({ where: { id: session.companyId } }),
  ]);
  const ratings = ggRatingTexts(company);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Item catalog"
        detail="Rating levels supply the points added into the appraisal total. Key and scorecard minimums drive the suggested rating."
        help="Key results, scorecard items, accountabilities, and behaviors are the lines on an appraisal. Each item has five rating levels and a point value. Key and scorecard items also have a minimum that suggests the rating from the entered amounts. Good to Great items are the questions on a talent review. The five rating labels under Good to Great ratings are the words shown in that dropdown."
      />
      <Banner message={params.message} error={params.error} />
      <CatalogBlock title="Key results" items={keys} createAction={createKeyItem} updateAction={updateKeyItem} />
      <CatalogBlock title="Scorecard" items={scorecards} createAction={createScorecardItem} updateAction={updateScorecardItem} />
      <CatalogBlock title="Accountabilities" items={accountabilities} createAction={createAccountabilityItem} updateAction={updateAccountabilityItem} />
      <CatalogBlock title="Behaviors" items={behaviors} createAction={createBehaviorItem} updateAction={updateBehaviorItem} />
      <Card title="Good to Great ratings">
        <form action={updateGgRatings} className="space-y-3">
          <p className="text-sm text-slate-600">These words appear beside scores 1 through 5 on every Good to Great question. Leave a box blank to show only the number. Saved reviews keep the number, so changing a label does not change past scores.</p>
          <div className="grid gap-3 sm:grid-cols-5">
            {ratings.map((label, index) => (
              <label key={index}>
                <span className={labelClass}>{index + 1}</span>
                <input className={inputClass} name={`rating${index + 1}`} defaultValue={label} maxLength={80} />
              </label>
            ))}
          </div>
          <button className={buttonClass} type="submit">Save ratings</button>
        </form>
      </Card>
      <Card title="Talent review items">
        <div className="space-y-3">
          {ggItems.map((item) => (
            <form key={item.id} action={updateGgItem} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[80px_1fr_1fr_auto]">
              <input type="hidden" name="id" value={item.id} />
              <input className={inputClass} name="itemSeq" type="number" defaultValue={item.itemSeq} />
              <input className={inputClass} name="itemText" defaultValue={item.itemText} />
              <input className={inputClass} name="helpText" defaultValue={item.helpText} />
              <button className={secondaryButtonClass} type="submit">Save</button>
            </form>
          ))}
          <form action={createGgItem} className="grid gap-2 sm:grid-cols-[80px_1fr_1fr_auto]">
            <input className={inputClass} name="itemSeq" type="number" placeholder="Seq" />
            <input className={inputClass} name="itemText" placeholder="Item" />
            <input className={inputClass} name="helpText" placeholder="Help text" />
            <button className={buttonClass} type="submit">Add</button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function CatalogBlock({
  title,
  items,
  createAction,
  updateAction,
}: {
  title: string;
  items: ({ id: string; name: string; sortOrder: number } & LevelSource)[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card title={title}>
      <div className="space-y-3">
        {items.map((item) => (
          <details key={item.id} className="rounded-md border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">{item.name}</summary>
            <form action={updateAction} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={item.id} />
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label><span className={labelClass}>Name</span><input className={inputClass} name="name" defaultValue={item.name} required /></label>
                <label><span className={labelClass}>Order</span><input className={inputClass} name="sortOrder" type="number" defaultValue={item.sortOrder} /></label>
              </div>
              <LevelFields item={item} />
              <button className={secondaryButtonClass} type="submit">Save item</button>
            </form>
          </details>
        ))}
        <details className="rounded-md border border-dashed border-slate-300 p-3">
          <summary className="cursor-pointer text-sm font-medium">Add {title.toLowerCase()}</summary>
          <form action={createAction} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <label><span className={labelClass}>Name</span><input className={inputClass} name="name" required /></label>
              <label><span className={labelClass}>Order</span><input className={inputClass} name="sortOrder" type="number" defaultValue={items.length + 1} /></label>
            </div>
            <LevelFields />
            <button className={buttonClass} type="submit">Add item</button>
          </form>
        </details>
      </div>
    </Card>
  );
}
