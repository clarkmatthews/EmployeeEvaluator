"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass } from "@/components/ui";
import type { ReviewMark } from "@/lib/review-status";

export type PickerCycle = {
  id: string;
  label: string;
  groups: { id: string; name: string }[];
};

export type PickerPerson = {
  id: string;
  groupId: string;
  name: string;
  number: string;
  status: "ACTIVE" | "LEAVE" | "INACTIVE";
  marks: { cycleId: string; mark: ReviewMark }[];
};

export function EmployeePicker({
  path,
  cycles,
  people,
  value,
}: {
  path: string;
  cycles: PickerCycle[];
  people: PickerPerson[];
  value: { cycleId: string; groupId: string; employeeId: string; inactive: boolean };
}) {
  const router = useRouter();
  const [cycleId, setCycleId] = useState(value.cycleId);
  const [groupId, setGroupId] = useState(value.groupId);
  const [employeeId, setEmployeeId] = useState(value.employeeId);
  const [inactive, setInactive] = useState(value.inactive);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setCycleId(value.cycleId);
    setGroupId(value.groupId);
    setEmployeeId(value.employeeId);
    setInactive(value.inactive);
    setEditing(false);
    setOpen(false);
  }, [value.cycleId, value.groupId, value.employeeId, value.inactive]);

  const cycle = cycles.find((item) => item.id === cycleId) ?? cycles[0];
  const groups = cycle?.groups ?? [];
  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  const inGroup = useMemo(
    () => people.filter((person) => person.groupId === group?.id && (inactive || person.status !== "INACTIVE")).sort((a, b) => a.name.localeCompare(b.name)),
    [people, group?.id, inactive],
  );
  const selected = inGroup.find((person) => person.id === employeeId) ?? inGroup[0];
  const shown = inGroup.filter((person) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${person.name} ${person.number}`.toLowerCase().includes(needle);
  });

  function go(next: { cycleId: string; groupId: string; employeeId: string; inactive: boolean }) {
    const url = new URLSearchParams();
    if (next.cycleId) url.set("cycleId", next.cycleId);
    if (next.groupId) url.set("groupId", next.groupId);
    if (next.employeeId) url.set("employeeId", next.employeeId);
    if (next.inactive) url.set("inactive", "1");
    const queryString = url.toString();
    router.push(queryString ? `${path}?${queryString}` : path, { scroll: false });
  }

  function chooseGroup(nextGroupId: string, nextCycleId = cycle?.id ?? "", nextInactive = inactive) {
    const nextPeople = people
      .filter((person) => person.groupId === nextGroupId && (nextInactive || person.status !== "INACTIVE"))
      .sort((a, b) => a.name.localeCompare(b.name));
    const nextEmployee = nextPeople.some((person) => person.id === employeeId) ? employeeId : nextPeople[0]?.id ?? "";
    setCycleId(nextCycleId);
    setGroupId(nextGroupId);
    setEmployeeId(nextEmployee);
    setInactive(nextInactive);
    setQuery("");
    setEditing(false);
    setOpen(false);
    go({ cycleId: nextCycleId, groupId: nextGroupId, employeeId: nextEmployee, inactive: nextInactive });
  }

  function choosePerson(person: PickerPerson) {
    setEmployeeId(person.id);
    setQuery("");
    setEditing(false);
    setOpen(false);
    go({ cycleId: cycle?.id ?? "", groupId: group?.id ?? "", employeeId: person.id, inactive });
  }

  return (
    <div style={{ position: "relative", zIndex: 20 }}>
    <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <label>
        <span className={labelClass}>Cycle</span>
        <select
          className={inputClass}
          value={cycle?.id ?? ""}
          onChange={(event) => {
            const nextCycle = cycles.find((item) => item.id === event.target.value);
            const nextGroup = nextCycle?.groups.find((item) => item.id === groupId) ?? nextCycle?.groups[0];
            if (nextCycle && nextGroup) chooseGroup(nextGroup.id, nextCycle.id);
          }}
        >
          {cycles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label>
        <span className={labelClass}>Group</span>
        <select
          className={inputClass}
          value={group?.id ?? ""}
          onChange={(event) => chooseGroup(event.target.value)}
        >
          {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <div className="sm:col-span-2">
        <span className={labelClass}>Employee</span>
        <div style={{ position: "relative" }}>
          <input
            className={inputClass}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            placeholder={inGroup.length ? "Search name or employee number" : "No employees in this group"}
            value={editing ? query : selected ? personLabel(selected, cycle?.id ?? "") : ""}
            disabled={!inGroup.length}
            onFocus={() => {
              setEditing(true);
              setQuery("");
              setOpen(true);
              setHighlight(0);
            }}
            onClick={() => {
              setEditing(true);
              setOpen(true);
            }}
            onBlur={() => {
              setEditing(false);
              setOpen(false);
            }}
            onChange={(event) => {
              setEditing(true);
              setQuery(event.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onKeyDown={(event) => {
              if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
                setOpen(true);
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlight((index) => Math.min(index + 1, Math.max(shown.length - 1, 0)));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlight((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && shown[highlight]) {
                event.preventDefault();
                choosePerson(shown[highlight]);
              } else if (event.key === "Escape") {
                setOpen(false);
                setEditing(false);
              }
            }}
          />
          {open ? (
            <ul
              role="listbox"
              className="rounded-md border border-slate-200 bg-white shadow-sm"
              style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "100%", marginTop: 4, maxHeight: "16rem", overflowY: "auto" }}
            >
              {shown.map((person, index) => (
                <li key={person.id} role="option" aria-selected={person.id === selected?.id}>
                  <button
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${index === highlight ? "bg-indigo-50" : ""}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choosePerson(person);
                    }}
                    onMouseEnter={() => setHighlight(index)}
                  >
                    <span className="flex items-center gap-2">
                      <ReviewMarkBadge mark={markFor(person, cycle?.id ?? "")} />
                      <span>{person.name}</span>
                    </span>
                    <span className="text-slate-500">{person.number}</span>
                  </button>
                </li>
              ))}
              {shown.length === 0 ? <li className="px-3 py-2 text-sm text-slate-500">No employees match that search.</li> : null}
            </ul>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {inGroup.length} {inGroup.length === 1 ? "employee" : "employees"} in {group?.name ?? "this group"}. (C) complete, (P) saved with blank fields, (I) not started.
        </p>
      </div>
    </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={inactive}
          onChange={(event) => {
            if (group && cycle) chooseGroup(group.id, cycle.id, event.target.checked);
          }}
        />
        Include inactive
      </label>
    </div>
  );
}

function personLabel(person: PickerPerson, cycleId: string) {
  const name = person.number ? `${person.name} · ${person.number}` : person.name;
  return `(${markFor(person, cycleId)}) ${name}`;
}

function markFor(person: PickerPerson, cycleId: string): ReviewMark {
  return person.marks.find((item) => item.cycleId === cycleId)?.mark ?? "I";
}

function ReviewMarkBadge({ mark }: { mark: ReviewMark }) {
  const title = mark === "C" ? "Complete" : mark === "P" ? "Saved with blank fields" : "Not started";
  const color = mark === "C" ? "text-indigo-700" : mark === "P" ? "text-amber-900" : "text-slate-500";
  return <span className={`font-semibold ${color}`} title={title}>({mark})</span>;
}
