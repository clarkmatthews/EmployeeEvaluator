"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";

export type FilterColumn = {
  key: string;
  label: string;
  filter: "search" | "select";
};

export type FilterRow = {
  id: string;
  cells: Record<string, string>;
  search?: Record<string, string>;
  href?: string;
  action?: { href: string; label: string };
};

export function FilterableTable({
  columns,
  rows,
  initialFilters,
  noun,
  empty,
  linkColumn,
  activeId,
  preserved,
}: {
  columns: FilterColumn[];
  rows: FilterRow[];
  initialFilters: Record<string, string>;
  noun: string;
  empty: string;
  linkColumn?: string;
  activeId?: string;
  preserved?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(() => initialOf(columns, initialFilters));
  const options = useMemo(() => {
    const values: Record<string, string[]> = {};
    for (const column of columns) {
      if (column.filter !== "select") continue;
      values[column.key] = [...new Set(rows.map((row) => row.cells[column.key] ?? "").filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      );
    }
    return values;
  }, [columns, rows]);
  const visible = rows.filter((row) =>
    columns.every((column) => {
      const filter = (filters[column.key] ?? "").trim().toLowerCase();
      if (!filter) return true;
      const value = (row.search?.[column.key] ?? row.cells[column.key] ?? "").toLowerCase();
      return column.filter === "select" ? value === filter : value.includes(filter);
    }),
  );
  const filtering = columns.some((column) => (filters[column.key] ?? "").trim());

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const url = new URLSearchParams(window.location.search);
      let changed = false;
      for (const column of columns) {
        const next = (filters[column.key] ?? "").trim();
        const current = url.get(column.key) ?? "";
        if (next === current) continue;
        changed = true;
        if (next) url.set(column.key, next);
        else url.delete(column.key);
      }
      if (!changed) return;
      const query = url.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [columns, filters, pathname, router]);

  function rowHref(row: FilterRow) {
    if (!row.href) return undefined;
    const url = new URL(row.href, "http://local");
    for (const column of columns) {
      const value = (filters[column.key] ?? "").trim();
      if (value) url.searchParams.set(column.key, value);
    }
    for (const [key, value] of Object.entries(preserved ?? {})) {
      if (value) url.searchParams.set(key, value);
    }
    const query = url.searchParams.toString();
    return query ? `${url.pathname}?${query}` : url.pathname;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>{filtering ? `${visible.length} of ${rows.length} ${noun}` : `${rows.length} ${noun}`}</p>
        {filtering ? (
          <button
            className="text-indigo-700 hover:underline"
            type="button"
            onClick={() => setFilters(initialOf(columns, {}))}
          >
            Clear filters
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-2 py-2 font-medium">{column.label}</th>
              ))}
              <th className="px-2 py-2" />
            </tr>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-2 pb-2 font-normal">
                  {column.filter === "select" ? (
                    <select
                      className={inputClass}
                      aria-label={`Filter ${column.label}`}
                      value={filters[column.key] ?? ""}
                      onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                    >
                      <option value="">All</option>
                      {(options[column.key] ?? []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputClass}
                      aria-label={`Search ${column.label}`}
                      placeholder="Search"
                      value={filters[column.key] ?? ""}
                      onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                    />
                  )}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className={`border-t border-slate-100 ${activeId === row.id ? "bg-indigo-50" : ""}`}>
                {columns.map((column) => {
                  const label = row.cells[column.key] ?? "";
                  const href = column.key === linkColumn ? rowHref(row) : undefined;
                  return (
                    <td key={column.key} className="px-2 py-2">
                      {href ? <Link className="text-indigo-700 hover:underline" href={href}>{label}</Link> : label}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right">
                  {row.action ? <Link className="text-indigo-700 hover:underline" href={row.action.href}>{row.action.label}</Link> : null}
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td className="px-2 py-6 text-slate-500" colSpan={columns.length + 1}>{empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function initialOf(columns: FilterColumn[], values: Record<string, string>) {
  return Object.fromEntries(columns.map((column) => [column.key, values[column.key] ?? ""]));
}
