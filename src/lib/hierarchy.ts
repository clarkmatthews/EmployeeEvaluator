export type Link = { parentId: string; childId: string };

export function descendantIds(rootIds: string[], links: Link[]) {
  const byParent = new Map<string, string[]>();
  for (const link of links) {
    const list = byParent.get(link.parentId) ?? [];
    list.push(link.childId);
    byParent.set(link.parentId, list);
  }
  const seen = new Set<string>();
  const stack = [...rootIds];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const child of byParent.get(id) ?? []) stack.push(child);
  }
  return seen;
}

export function ancestorIds(startId: string, links: Link[]) {
  const byChild = new Map<string, string[]>();
  for (const link of links) {
    const list = byChild.get(link.childId) ?? [];
    list.push(link.parentId);
    byChild.set(link.childId, list);
  }
  const seen = new Set<string>();
  const stack = [...(byChild.get(startId) ?? [])];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const parent of byChild.get(id) ?? []) stack.push(parent);
  }
  return seen;
}

export function wouldCycle(childId: string, parentId: string, links: Link[]) {
  if (!parentId) return false;
  if (childId === parentId) return true;
  return descendantIds([childId], links).has(parentId);
}

export function rootsOf<T extends { id: string }>(groups: T[], links: Link[]) {
  const childIds = new Set(links.map((link) => link.childId));
  return groups.filter((group) => !childIds.has(group.id));
}

export function childrenOf(parentId: string, links: Link[]) {
  return links.filter((link) => link.parentId === parentId).map((link) => link.childId);
}
