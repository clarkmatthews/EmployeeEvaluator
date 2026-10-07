import { canEditEvaluation } from "../src/lib/access";

const cycle = { locked: false, closeDate: null };
const base = {
  employeeStatus: "ACTIVE" as const,
  employeeId: "employee",
  groupAllowsSelfEdit: true,
  hasGroupAccess: true,
  cycle,
  unlocked: false,
};

function check(label: string, session: { userId: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE" }, extra: Partial<typeof base> = {}) {
  const result = canEditEvaluation({
    session: { ...session, companyId: "c", email: "", firstName: "", lastName: "", name: "" },
    ...base,
    ...extra,
  });
  console.log(label, JSON.stringify({ editable: result.editable, asEmployee: result.asEmployee, asSupervisor: result.asSupervisor, reason: result.reason }));
}

check("employee self", { userId: "employee", role: "EMPLOYEE" });
check("manager self", { userId: "employee", role: "MANAGER" });
check("admin self", { userId: "employee", role: "ADMIN" });
check("manager other", { userId: "manager", role: "MANAGER" });
check("admin other", { userId: "admin", role: "ADMIN" });
check("manager other no access", { userId: "manager", role: "MANAGER" }, { hasGroupAccess: false, groupAllowsSelfEdit: false });
