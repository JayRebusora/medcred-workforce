// src/components/layout/Sidebar.tsx
// Role-aware sidebar. Each nav item declares which roles can see it;
// we filter based on the current user's role and hide everything else.

import Link from "next/link";
import { Role } from "@prisma/client";

type NavItem = {
  label: string;
  href: string;
  roles: Role[];
  // Group nav items visually under a section label
  section: "main" | "admin" | "me" | "facility";
};

const NAV: NavItem[] = [
  // Everyone
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["ADMIN", "EMPLOYEE", "CLIENT"],
    section: "main",
  },
  {
    label: "Messages",
    href: "/messages",
    roles: ["ADMIN", "EMPLOYEE", "CLIENT"],
    section: "main",
  },
  {
    label: "Notifications",
    href: "/notifications",
    roles: ["ADMIN", "EMPLOYEE", "CLIENT"],
    section: "main",
  },

  // Admin-only management
  {
    label: "Applications",
    href: "/applications",
    roles: ["ADMIN"],
    section: "admin",
  },
  {
    label: "Employees",
    href: "/employees",
    roles: ["ADMIN"],
    section: "admin",
  },
  {
    label: "Facilities",
    href: "/facilities",
    roles: ["ADMIN"],
    section: "admin",
  },
  {
    label: "Credentials",
    href: "/credentials",
    roles: ["ADMIN"],
    section: "admin",
  },
  { label: "Shifts", href: "/shifts", roles: ["ADMIN"], section: "admin" },
  { label: "Users", href: "/users", roles: ["ADMIN"], section: "admin" },
  { label: "Audit Log", href: "/audit", roles: ["ADMIN"], section: "admin" },

  // Employee self-service
  {
    label: "My Credentials",
    href: "/my/credentials",
    roles: ["EMPLOYEE"],
    section: "me",
  },
  {
    label: "My Shifts",
    href: "/my/shifts",
    roles: ["EMPLOYEE"],
    section: "me",
  },

  // Client (facility) management
  {
    label: "My Facility",
    href: "/my/facility",
    roles: ["CLIENT"],
    section: "facility",
  },
  {
    label: "Shift Requests",
    href: "/my/shifts",
    roles: ["CLIENT"],
    section: "facility",
  },
  {
    label: "Assigned Staff",
    href: "/my/staff",
    roles: ["CLIENT"],
    section: "facility",
  },
];

const SECTION_LABELS: Record<NavItem["section"], string> = {
  main: "General",
  admin: "Management",
  me: "My Portal",
  facility: "My Facility",
};

export function Sidebar({ role }: { role: Role }) {
  const visible = NAV.filter((item) => item.roles.includes(role));
  const sections = Array.from(new Set(visible.map((i) => i.section)));

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          MedCred Workforce
        </span>
      </div>

      <nav className="p-3">
        {sections.map((section) => {
          const items = visible.filter((i) => i.section === section);
          return (
            <div key={section} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {SECTION_LABELS[section]}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-md px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
