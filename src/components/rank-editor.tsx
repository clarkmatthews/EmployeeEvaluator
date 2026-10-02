"use client";

import { useState } from "react";
import { saveRanks } from "@/actions/talent";
import { buttonClass, secondaryButtonClass } from "@/components/ui";

export function RankEditor({
  cycleId,
  groupId,
  people,
  perfOrder,
  potlOrder,
}: {
  cycleId: string;
  groupId: string;
  people: { id: string; name: string }[];
  perfOrder: string[];
  potlOrder: string[];
}) {
  const [perf, setPerf] = useState(orderOf(people, perfOrder));
  const [potl, setPotl] = useState(orderOf(people, potlOrder));
  return (
    <form action={saveRanks} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="perfOrder" value={perf.join(",")} />
      <input type="hidden" name="potlOrder" value={potl.join(",")} />
      <RankList title="Performance rank" ids={perf} people={people} onChange={setPerf} />
      <RankList title="Potential rank" ids={potl} people={people} onChange={setPotl} />
      <button className={buttonClass} type="submit">Save rankings</button>
    </form>
  );
}

function orderOf(people: { id: string }[], saved: string[]) {
  const known = new Set(people.map((person) => person.id));
  const ranked = saved.filter((id) => known.has(id));
  const rest = people.map((person) => person.id).filter((id) => !ranked.includes(id));
  return [...ranked, ...rest];
}

function RankList({
  title,
  ids,
  people,
  onChange,
}: {
  title: string;
  ids: string[];
  people: { id: string; name: string }[];
  onChange: (ids: string[]) => void;
}) {
  const names = new Map(people.map((person) => [person.id, person.name]));
  function move(index: number, direction: -1 | 1) {
    const next = [...ids];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <ol className="space-y-2">
        {ids.map((id, index) => (
          <li key={id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1 text-sm">
            <span>{index + 1}. {names.get(id)}</span>
            <span className="flex gap-1">
              <button className={secondaryButtonClass} type="button" onClick={() => move(index, -1)}>Up</button>
              <button className={secondaryButtonClass} type="button" onClick={() => move(index, 1)}>Down</button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
