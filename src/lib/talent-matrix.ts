import { accessibleGroupIds, companyLinks } from "@/lib/access";
import { childrenOf, descendantIds, type Link } from "@/lib/hierarchy";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/scoring";

export const MATRIX_VIEWS = [
  {
    id: "by-group",
    label: "By group",
    description:
      "One 9-box for each group in the selected branch that has a talent review. A person stays on the group where the review was saved. Parent groups are printed before their children.",
  },
  {
    id: "rollup",
    label: "Rolled up",
    description: "One 9-box for the selected group and every group under it.",
  },
  {
    id: "both",
    label: "Branch, then groups",
    description:
      "The rolled-up 9-box first, then a 9-box for each group in the branch that has a talent review.",
  },
] as const;

export type MatrixView = (typeof MATRIX_VIEWS)[number]["id"];

type PerfBand = "high" | "acceptable" | "poor";
type PotlBand = "low" | "uncertain" | "high";

const PERF_LABEL: Record<PerfBand, string> = {
  high: "High",
  acceptable: "Acceptable",
  poor: "Poor",
};

const POTL_LABEL: Record<PotlBand, string> = {
  low: "Low",
  uncertain: "Uncertain",
  high: "High",
};

const CELLS: { perf: PerfBand; potl: PotlBand; caption: string }[] = [
  { perf: "high", potl: "low", caption: "Resident expert, keep in position." },
  { perf: "high", potl: "uncertain", caption: "Develop skills for future growth. Could be a stretch promotion with adequate support." },
  { perf: "high", potl: "high", caption: "Promotable now or within the next 6 months." },
  { perf: "acceptable", potl: "low", caption: "Try to develop into a resident expert. Keep in position." },
  { perf: "acceptable", potl: "uncertain", caption: "Develop within position to strengthen current performance." },
  { perf: "acceptable", potl: "high", caption: "Develop within position to drive greater results." },
  { perf: "poor", potl: "low", caption: "Out of the company within the next 6 months." },
  { perf: "poor", potl: "uncertain", caption: "Put on an action plan to develop performance." },
  { perf: "poor", potl: "high", caption: "In position less than 6 months. Develop within position." },
];

export type MatrixPerson = {
  evaluationId: string;
  groupId: string;
  name: string;
  sortName: string;
  groupName: string;
  performance: string;
  potential: string;
};

export type MatrixRank = {
  id: string;
  name: string;
  groupName: string;
  perfRank: number | null;
  potlRank: number | null;
};

export type MatrixBox = {
  title: string;
  caption: string;
  people: MatrixPerson[];
};

export type MatrixSection = {
  id: string;
  title: string;
  boxes: MatrixBox[];
  unplaced: MatrixPerson[];
  ranks: MatrixRank[];
  showGroup: boolean;
};

export function isMatrixView(value: string): value is MatrixView {
  return MATRIX_VIEWS.some((view) => view.id === value);
}

export function mapPerformance(value: string): PerfBand | null {
  if (value === "Outstanding" || value === "Exceeds expectations") return "high";
  if (value === "Meets expectations") return "acceptable";
  if (value === "Needs improvement" || value === "Unsatisfactory") return "poor";
  return null;
}

export function mapPotential(value: string): PotlBand | null {
  if (value === "High") return "high";
  if (value === "Medium") return "uncertain";
  if (value === "Low") return "low";
  return null;
}

export function walkBranch(rootId: string, groups: { id: string; name: string }[], links: Link[]) {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const ordered: { id: string; name: string }[] = [];
  const visit = (id: string) => {
    const group = byId.get(id);
    if (!group || ordered.some((row) => row.id === id)) return;
    ordered.push(group);
    const children = childrenOf(id, links)
      .map((childId) => byId.get(childId))
      .filter((child): child is { id: string; name: string } => Boolean(child))
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) visit(child.id);
  };
  visit(rootId);
  return ordered;
}

function place(people: MatrixPerson[], ratings: Map<string, { perf: PerfBand | null; potl: PotlBand | null }>) {
  const boxes: MatrixBox[] = CELLS.map((cell) => ({
    title: `${PERF_LABEL[cell.perf]} performance + ${POTL_LABEL[cell.potl]} potential`,
    caption: cell.caption,
    people: [],
  }));
  const unplaced: MatrixPerson[] = [];
  const sorted = [...people].sort((left, right) => left.sortName.localeCompare(right.sortName));
  for (const person of sorted) {
    const rating = ratings.get(person.evaluationId);
    const index = rating?.perf && rating.potl ? CELLS.findIndex((cell) => cell.perf === rating.perf && cell.potl === rating.potl) : -1;
    if (index < 0) unplaced.push(person);
    else boxes[index].people.push(person);
  }
  return { boxes, unplaced };
}

function sectionFor(
  id: string,
  title: string,
  people: MatrixPerson[],
  ratings: Map<string, { perf: PerfBand | null; potl: PotlBand | null }>,
  ranks: MatrixRank[],
  showGroup: boolean,
): MatrixSection {
  const placed = place(people, ratings);
  return { id, title, ...placed, ranks, showGroup };
}

export async function loadTalentMatrix(session: SessionUser, cycleId: string, groupId: string, view: MatrixView) {
  if (session.role === "EMPLOYEE") return null;
  const access = await accessibleGroupIds(session);
  if (!access.has(groupId)) return null;
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId: session.companyId, formKind: { name: "TOPS" } },
    include: { company: true },
  });
  if (!cycle) return null;
  const { links } = await companyLinks(session.companyId);
  const branchIds = [...descendantIds([groupId], links)].filter((id) => access.has(id));
  const groups = await prisma.orgGroup.findMany({
    where: { id: { in: branchIds }, companyId: session.companyId },
    select: { id: true, name: true },
  });
  const ordered = walkBranch(groupId, groups, links);
  const root = ordered[0];
  if (!root) return null;

  const reviews = await prisma.talentReview.findMany({
    where: { evaluation: { cycleId: cycle.id, groupId: { in: ordered.map((group) => group.id) } } },
    include: { evaluation: { include: { employee: true, group: true } } },
  });
  const ranks = await prisma.talentRank.findMany({
    where: { cycleId: cycle.id, groupId: { in: ordered.map((group) => group.id) } },
    include: { user: true, group: true },
  });

  const people: MatrixPerson[] = reviews.map((review) => ({
    evaluationId: review.evaluationId,
    groupId: review.evaluation.groupId,
    name: `${review.evaluation.employee.firstName} ${review.evaluation.employee.lastName}`,
    sortName: `${review.evaluation.employee.lastName}, ${review.evaluation.employee.firstName}`,
    groupName: review.evaluation.group.name,
    performance: review.performance,
    potential: review.potential,
  }));
  const ratings = new Map(
    reviews.map((review) => [review.evaluationId, { perf: mapPerformance(review.performance), potl: mapPotential(review.potential) }] as const),
  );
  const rankRows: (MatrixRank & { groupId: string })[] = ranks
    .map((rank) => ({
      id: rank.id,
      groupId: rank.groupId,
      name: `${rank.user.firstName} ${rank.user.lastName}`,
      groupName: rank.group.name,
      perfRank: rank.perfRank,
      potlRank: rank.potlRank,
    }))
    .sort((left, right) => (left.perfRank ?? 999) - (right.perfRank ?? 999) || left.name.localeCompare(right.name));

  const byGroup = ordered
    .map((group) => {
      const groupPeople = people.filter((person) => person.groupId === group.id);
      return sectionFor(
        group.id,
        `${cycle.year} · ${group.name}`,
        groupPeople,
        ratings,
        rankRows.filter((rank) => rank.groupId === group.id),
        false,
      );
    })
    .filter((section) => section.boxes.some((box) => box.people.length) || section.unplaced.length);

  const rollup = sectionFor(
    `rollup-${root.id}`,
    `${cycle.year} · ${root.name} and the groups under it`,
    people,
    ratings,
    rankRows,
    ordered.length > 1,
  );

  const sections = view === "rollup" ? [rollup] : view === "by-group" ? byGroup : [rollup, ...byGroup];
  return {
    companyName: cycle.company.name,
    year: cycle.year,
    rootName: root.name,
    view,
    sections,
  };
}
