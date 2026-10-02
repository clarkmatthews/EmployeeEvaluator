"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/actions/auth";
import type { Role } from "@/lib/scoring";

const primary: { href: string; label: string; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/appraisals", label: "Appraisals", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/talent", label: "Talent reviews", roles: ["ADMIN", "MANAGER"] },
  { href: "/people", label: "People", roles: ["ADMIN"] },
  { href: "/reports", label: "Reports", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
];

const setup: { href: string; label: string; roles: Role[] }[] = [
  { href: "/organization", label: "Organization", roles: ["ADMIN"] },
  { href: "/cycles", label: "Cycles", roles: ["ADMIN"] },
  { href: "/templates", label: "Form templates", roles: ["ADMIN"] },
  { href: "/catalog", label: "Item catalog", roles: ["ADMIN"] },
  { href: "/import", label: "Key values", roles: ["ADMIN"] },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppNav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const primaryLinks = primary.filter((link) => link.roles.includes(role));
  const setupLinks = setup.filter((link) => link.roles.includes(role));
  const setupActive = setupLinks.some((link) => isCurrent(pathname, link.href));
  const [open, setOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(setupActive);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-slate-200 bg-slate-900 text-white" style={{ position: "relative" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md hover:bg-slate-800"
          style={{ width: 36, height: 36 }}
          aria-expanded={open}
          aria-controls="app-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="flex" style={{ width: 18, gap: 4, flexDirection: "column" }}>
            <span className="block bg-white" style={{ height: 2, transform: open ? "translateY(6px) rotate(45deg)" : undefined }} />
            <span className="block bg-white" style={{ height: 2, opacity: open ? 0 : 1 }} />
            <span className="block bg-white" style={{ height: 2, transform: open ? "translateY(-6px) rotate(-45deg)" : undefined }} />
          </span>
        </button>
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          EmployeeEvaluator
        </Link>
        <div className="flex items-center gap-3 text-sm" style={{ marginLeft: "auto" }}>
          <span className="text-slate-300">{name}</span>
          <form action={logout}>
            <button className="rounded-md border border-slate-600 px-2 py-1 hover:bg-slate-800" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {open ? (
        <nav
          id="app-menu"
          className="border border-slate-200 bg-white text-slate-900 shadow-lg"
          style={{ position: "absolute", left: 0, top: "100%", zIndex: 30, width: "18rem" }}
        >
          <ul className="py-2">
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-4 py-2 text-sm ${isCurrent(pathname, link.href) ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {setupLinks.length ? (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium hover:bg-slate-50"
                  aria-expanded={setupOpen}
                  onClick={() => setSetupOpen((current) => !current)}
                >
                  Setup
                  <span className="text-xs text-slate-500">{setupOpen ? "−" : "+"}</span>
                </button>
                {setupOpen ? (
                  <ul className="pb-2">
                    {setupLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={`block py-2 pr-4 text-sm ${isCurrent(pathname, link.href) ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
                          style={{ paddingLeft: "2rem" }}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
