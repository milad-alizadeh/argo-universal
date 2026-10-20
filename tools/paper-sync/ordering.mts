import type { Registry, Snapshot } from './model.mts';

type Family = Registry['families'][number];

type Ordering = {
  families: Family[];
  dependencies: Map<string, string[]>;
  visiting: Set<string>;
  done: Set<string>;
  ordered: Family[];
};

function append(name: string, context: Ordering): void {
  context.visiting.delete(name);
  context.done.add(name);
  const family = context.families.find((item) => item.name === name);

  if (family) context.ordered.push(family);
}

function traverse(name: string, context: Ordering): void {
  if (context.visiting.has(name))
    throw new Error(
      `Nested master cycle: ${[...context.visiting, name].join(' → ')}`,
    );
  context.visiting.add(name);
  const children = dependencyNames(name, context);

  for (const child of children) visit(child, context);
  append(name, context);
}

function visit(name: string, context: Ordering): void {
  if (!context.done.has(name)) traverse(name, context);
}

function children(name: string, snapshot: Snapshot | undefined): string[] {
  if (!snapshot) return [];

  // A layer named after its own master is part of it, not a nested copy.
  return snapshot.nodes.flatMap((node) =>
    node.nested && node.name !== name ? [node.name] : [],
  );
}

export function insideOut(
  families: Family[],
  snapshots: Map<string, Snapshot>,
): Family[] {
  const dependencies = new Map(
    families.map((family) => [
      family.name,
      children(family.name, snapshots.get(family.name)),
    ]),
  );

  const visited = { visiting: new Set<string>(), done: new Set<string>() };
  const context: Ordering = { families, dependencies, ...visited, ordered: [] };

  for (const family of families) visit(family.name, context);

  return context.ordered;
}

function dependencyNames(name: string, context: Ordering): string[] {
  return context.dependencies.get(name) ?? [];
}
