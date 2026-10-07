import { createPerson, deletePerson, updatePerson } from "@/actions/people";
import { FilterableTable } from "@/components/filterable-table";
import { Banner, Card, PageHeader, buttonClass, dangerButtonClass, inputClass, labelClass } from "@/components/ui";
import { personName, roleLabel, statusLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const peopleColumns = [
  { key: "name", label: "Name", filter: "search" as const },
  { key: "email", label: "Email", filter: "search" as const },
  { key: "role", label: "Role", filter: "select" as const },
  { key: "status", label: "Status", filter: "select" as const },
  { key: "number", label: "Number", filter: "search" as const },
];

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; message?: string; error?: string; name?: string; email?: string; role?: string; status?: string; number?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const users = await prisma.user.findMany({
    where: { companyId: session.companyId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const selected = users.find((user) => user.id === params.user) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="People"
        detail="Employees, managers, and administrators for this company."
        help="Search name, email, and employee number. Filter Role and Status from the column headers. Inactive people cannot sign in and are left out of dashboard counts. Add a person here, then add them to a group on the Organization page so they appear on appraisals and talent reviews."
      />
      <Banner message={params.message} error={params.error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Directory">
          <FilterableTable
            columns={peopleColumns}
            noun="people"
            empty="No people match these filters."
            linkColumn="name"
            activeId={selected?.id}
            preserved={{ message: params.message ?? "", error: params.error ?? "" }}
            initialFilters={{
              name: params.name ?? "",
              email: params.email ?? "",
              role: params.role ?? "",
              status: params.status ?? "",
              number: params.number ?? "",
            }}
            rows={users.map((user) => ({
              id: user.id,
              href: `/people?user=${user.id}`,
              cells: {
                name: personName(user),
                email: user.email,
                role: roleLabel(user.role),
                status: statusLabel(user.status),
                number: user.employeeNumber ?? "",
              },
            }))}
          />
        </Card>
        <Card title={selected ? "Edit person" : "Add person"}>
          <PersonForm user={selected} />
          {selected ? (
            <form action={deletePerson} className="mt-3">
              <input type="hidden" name="id" value={selected.id} />
              <button className={dangerButtonClass} type="submit">Delete</button>
            </form>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function PersonForm({
  user,
}: {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
    employeeNumber: string | null;
    whoType: string;
    jobTitle: string;
    department: string;
  } | null;
}) {
  return (
    <form action={user ? updatePerson : createPerson} className="space-y-3">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <label className="block"><span className={labelClass}>First name</span><input className={inputClass} name="firstName" defaultValue={user?.firstName} required /></label>
      <label className="block"><span className={labelClass}>Last name</span><input className={inputClass} name="lastName" defaultValue={user?.lastName} required /></label>
      <label className="block"><span className={labelClass}>Email</span><input className={inputClass} name="email" type="email" defaultValue={user?.email} required /></label>
      <label className="block"><span className={labelClass}>{user ? "New password" : "Password"}</span><input className={inputClass} name="password" type="password" minLength={12} required={!user} /></label>
      <label className="block">
        <span className={labelClass}>Role</span>
        <select className={inputClass} name="role" defaultValue={user?.role ?? "EMPLOYEE"}>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Status</span>
        <select className={inputClass} name="status" defaultValue={user?.status ?? "ACTIVE"}>
          <option value="ACTIVE">Active</option>
          <option value="LEAVE">Leave</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </label>
      <label className="block"><span className={labelClass}>Employee number</span><input className={inputClass} name="employeeNumber" defaultValue={user?.employeeNumber ?? ""} /></label>
      <label className="block"><span className={labelClass}>Employee type</span><input className={inputClass} name="whoType" defaultValue={user?.whoType ?? "Employee"} /></label>
      <label className="block"><span className={labelClass}>Job title</span><input className={inputClass} name="jobTitle" defaultValue={user?.jobTitle ?? ""} /></label>
      <label className="block"><span className={labelClass}>Department</span><input className={inputClass} name="department" defaultValue={user?.department ?? ""} /></label>
      <button className={buttonClass} type="submit">{user ? "Save person" : "Add person"}</button>
    </form>
  );
}
