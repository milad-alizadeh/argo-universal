const identities = new WeakMap<object, string>();

let nextIdentity = 0;

export function itemIdentity<Item>(item: Item): string {
  if (typeof item !== 'object' || item === null) return String(item);

  return objectIdentity(item);
}

function objectIdentity<Item extends object>(item: Item): string {
  const existing = identities.get(item);

  if (existing !== undefined) return existing;
  const id = `row-${nextIdentity++}`;
  identities.set(item, id);

  return id;
}
