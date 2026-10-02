import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { createGroup, deleteGroup, moveGroup, setMembers, setOwners, updateGroup } from "@/actions/organization";
import { PersonChecklist } from "@/components/person-checklist";
import { Banner, Card, PageHeader, buttonClass, dangerButtonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import { ASSISTANT_MANAGER, personName, roleLabel, statusLabel } from "@/lib/format";
import { ancestorIds, childrenOf, rootsOf } from "@/lib/hierarchy";
import Link from "next/link";

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; message?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const [types, groups, users] = await Promise.all([
    prisma.groupType.findMany({ where: { companyId: session.companyId }, orderBy: { name: "asc" } }),
    prisma.orgGroup.findMany({
      where: { companyId: session.companyId },
      include: {
        groupType: true,
        parentLinks: true,
        childLinks: true,
        members: { include: { user: true } },
        owners: { include: { user: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { companyId: session.companyId }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
  ]);
  const links = groups.flatMap((group) => group.parentLinks.map((link) => ({ parentId: link.parentId, childId: link.childId })));
  const selected = groups.find((group) => group.id === params.group) ?? null;
  const inheritedOwnerIds = selected ? ancestorIds(selected.id, links) : new Set<string>();
  const inheritedOwners = groups
    .filter((group) => inheritedOwnerIds.has(group.id))
    .flatMap((group) => group.owners.map((owner) => `${personName(owner.user)} (${group.name})`));
  const childMemberNames = selected
    ? groups
        .filter((group) => childrenOf(selected.id, links).includes(group.id))
        .flatMap((group) => group.members.map((member) => `${personName(member.user)} (${group.name})`))
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization"
        detail="Groups, members, and owners. Owners can rate people in a group and its child groups."
        help="Groups form the company tree. Members are the people evaluated in that group. Owners can rate people in the group and in the groups under it. Search the member and owner lists, then save. A person must be a member of a group before they show up in that group's appraisal or talent review."
      />
      <Banner message={params.message} error={params.error} />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="Groups">
          <GroupTree groups={groups} links={links} selectedId={selected?.id} />
        </Card>
        <div className="space-y-4">
          <Card title="Add a group">
            <form action={createGroup} className="grid gap-3 sm:grid-cols-2">
              <label><span className={labelClass}>Name</span><input className={inputClass} name="name" required /></label>
              <label>
                <span className={labelClass}>Type</span>
                <select className={inputClass} name="groupTypeId" required>
                  {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>Parent</span>
                <select className={inputClass} name="parentId" defaultValue="">
                  <option value="">None</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
              <label className="flex items-end gap-2 text-sm"><input name="usersCanEditOwnAppraisal" type="checkbox" /> Members can edit their own appraisal</label>
              <button className={buttonClass} type="submit">Add group</button>
            </form>
          </Card>
          {selected ? (
            <>
              <Card title={selected.name}>
                <form action={updateGroup} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={selected.id} />
                  <label><span className={labelClass}>Name</span><input className={inputClass} name="name" defaultValue={selected.name} required /></label>
                  <label>
                    <span className={labelClass}>Type</span>
                    <select className={inputClass} name="groupTypeId" defaultValue={selected.groupTypeId}>
                      {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input name="active" type="checkbox" defaultChecked={selected.active} /> Active
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      name="usersCanEditOwnAppraisal"
                      type="checkbox"
                      defaultChecked={selected.usersCanEditOwnAppraisal}
                      disabled={selected.groupType.name === ASSISTANT_MANAGER}
                    />
                    Members can edit their own appraisal
                  </label>
                  {selected.groupType.name === ASSISTANT_MANAGER ? <p className="text-sm text-slate-500 sm:col-span-2">Assistant Manager groups cannot turn on self-evaluation.</p> : null}
                  <button className={buttonClass} type="submit">Save group</button>
                </form>
              </Card>
              <Card title="Members">
                <form action={setMembers} className="space-y-3">
                  <input type="hidden" name="id" value={selected.id} />
                  <PersonChecklist
                    name="userId"
                    selectedIds={selected.members.map((member) => member.userId)}
                    people={users.map((user) => ({
                      id: user.id,
                      name: personName(user),
                      detail: user.email,
                      email: user.email,
                      number: user.employeeNumber ?? "",
                      role: roleLabel(user.role),
                      status: statusLabel(user.status),
                    }))}
                  />
                  <button className={buttonClass} type="submit">Save members</button>
                </form>
                {childMemberNames.length ? <p className="mt-3 text-sm text-slate-600">Inherited from child groups: {childMemberNames.join("; ")}</p> : null}
              </Card>
              <Card title="Owners">
                <form action={setOwners} className="space-y-3">
                  <input type="hidden" name="id" value={selected.id} />
                  <PersonChecklist
                    name="userId"
                    selectedIds={selected.owners.map((owner) => owner.userId)}
                    people={users.filter((user) => user.role !== "EMPLOYEE").map((user) => ({
                      id: user.id,
                      name: personName(user),
                      detail: roleLabel(user.role),
                      email: user.email,
                      number: user.employeeNumber ?? "",
                      role: roleLabel(user.role),
                      status: statusLabel(user.status),
                    }))}
                  />
                  <button className={buttonClass} type="submit">Save owners</button>
                </form>
                {inheritedOwners.length ? <p className="mt-3 text-sm text-slate-600">Inherited owners: {inheritedOwners.join("; ")}</p> : null}
              </Card>
              <Card title="Move or delete">
                <form action={moveGroup} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={selected.id} />
                  <label>
                    <span className={labelClass}>New parent</span>
                    <select className={inputClass} name="parentId" defaultValue={selected.parentLinks[0]?.parentId ?? ""}>
                      <option value="">None</option>
                      {groups.filter((group) => group.id !== selected.id).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                  </label>
                  <button className={secondaryButtonClass} type="submit">Move</button>
                </form>
                <form action={deleteGroup} className="mt-3">
                  <input type="hidden" name="id" value={selected.id} />
                  <button className={dangerButtonClass} type="submit">Delete group</button>
                </form>
              </Card>
            </>
          ) : <Card><p className="text-sm text-slate-600">Select a group to edit members and owners.</p></Card>}
        </div>
      </div>
    </div>
  );
}

function GroupTree({
  groups,
  links,
  selectedId,
}: {
  groups: { id: string; name: string; active: boolean }[];
  links: { parentId: string; childId: string }[];
  selectedId?: string;
}) {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const render = (id: string, depth: number, trail: Set<string>) => {
    if (trail.has(id)) return null;
    const group = byId.get(id);
    if (!group) return null;
    const next = new Set(trail);
    next.add(id);
    return (
      <li key={id}>
        <Link href={`/organization?group=${id}`} className={`block rounded px-2 py-1 text-sm ${selectedId === id ? "bg-indigo-50 text-indigo-800" : "hover:bg-slate-50"} ${group.active ? "" : "text-slate-400"}`} style={{ paddingLeft: 8 + depth * 12 }}>
          {group.name}
        </Link>
        <ul>{childrenOf(id, links).map((childId) => render(childId, depth + 1, next))}</ul>
      </li>
    );
  };
  const roots = rootsOf(groups, links);
  return <ul>{roots.map((group) => render(group.id, 0, new Set()))}</ul>;
}
