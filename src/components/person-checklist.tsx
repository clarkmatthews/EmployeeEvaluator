"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";

export function PersonChecklist({
  people,
  selectedIds,
  name,
}: {
  people: { id: string; name: string; detail: string; email: string; number: string; role: string; status: string }[];
  selectedIds: string[];
  name: string;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const needle = query.trim().toLowerCase();
  const roles = [...new Set(people.map((person) => person.role))].sort();
  const statuses = [...new Set(people.map((person) => person.status))].sort();
  const visibleCount = people.filter((person) => matches(person, needle, role, status)).length;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className={inputClass}
          value={query}
          placeholder="Search name, email, or number"
          aria-label="Search people"
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className={inputClass} aria-label="Filter role" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="">All roles</option>
          {roles.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className={inputClass} aria-label="Filter status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <p className="text-sm text-slate-500">{visibleCount} of {people.length} people</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {people.map((person) => {
          const visible = matches(person, needle, role, status);
          return (
            <label key={person.id} className="flex items-center gap-2 text-sm" style={{ display: visible ? undefined : "none" }}>
              <input type="checkbox" name={name} value={person.id} defaultChecked={selectedIds.includes(person.id)} />
              {person.name} · {person.detail}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function matches(
  person: { name: string; email: string; number: string; role: string; status: string },
  needle: string,
  role: string,
  status: string,
) {
  if (role && person.role !== role) return false;
  if (status && person.status !== status) return false;
  if (!needle) return true;
  return `${person.name} ${person.email} ${person.number}`.toLowerCase().includes(needle);
}
