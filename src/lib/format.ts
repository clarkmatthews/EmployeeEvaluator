export function dateInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

export function todayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function cycleIsLocked(cycle: { locked: boolean; closeDate: Date | null }) {
  if (cycle.locked) return true;
  if (!cycle.closeDate) return false;
  return cycle.closeDate.getTime() < todayUtcDate().getTime();
}

export function formKindLabel(name: "PA" | "TOPS") {
  return name === "PA" ? "Performance appraisal" : "Talent review";
}

export function statusLabel(status: "ACTIVE" | "LEAVE" | "INACTIVE") {
  if (status === "ACTIVE") return "Active";
  if (status === "LEAVE") return "Leave";
  return "Inactive";
}

export function roleLabel(role: "ADMIN" | "MANAGER" | "EMPLOYEE") {
  if (role === "ADMIN") return "Admin";
  if (role === "MANAGER") return "Manager";
  return "Employee";
}

export function personName(person: { firstName: string; lastName: string; status?: string }) {
  const name = `${person.lastName}, ${person.firstName}`;
  return person.status === "INACTIVE" ? `INACTIVE: ${name}` : name;
}

export function num(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function checked(formData: FormData, name: string) {
  return formData.get(name) != null;
}

export function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function intOrNull(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function decOrNull(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ids(formData: FormData, name: string) {
  return formData.getAll(name).map(String).filter(Boolean);
}

export const ASSISTANT_MANAGER = "Assistant Manager";
