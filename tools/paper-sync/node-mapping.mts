import { codeName } from './catalog.mts';
import { iconGroups, iconSlots } from './icons.mts';
import {
  required,
  type Binding,
  type DesignNode,
  type Snapshot,
} from './model.mts';

type Pair = { master: Snapshot; copy: Snapshot };

function sameRole(source: DesignNode, node: DesignNode): boolean {
  if (bothNested(source, node))
    return codeName(source.name) === codeName(node.name);

  return node.name === source.name && node.component === source.component;
}

function mapSource(
  source: DesignNode,
  snapshots: Pair,
  nodes: Binding['nodes'],
): void {
  const peers = snapshots.master.nodes.filter((node) => sameRole(source, node));

  const matches = snapshots.copy.nodes.filter(
    (node) => sameRole(source, node) && !Object.values(nodes).includes(node.id),
  );

  if (peers.length === 1 && matches.length === 1)
    nodes[source.id] = required(matches[0]).id;
}

function alignedChildren(
  source: DesignNode,
  pair: Pair,
  nodes: Binding['nodes'],
): void {
  const target = pair.copy.nodes.find((node) => node.id === nodes[source.id]);

  if (!target) return;
  alignChildren(source, target, { pair, nodes });
}

function alignChildren(
  source: DesignNode,
  target: DesignNode,
  context: { pair: Pair; nodes: Binding['nodes'] },
): void {
  if (source.childIds.length !== target.childIds.length) return;
  const { pair, nodes } = context;

  for (const [index, id] of source.childIds.entries())
    alignChild(pair, nodes, { id, target: required(target.childIds[index]) });
}

function alignChild(
  pair: Pair,
  nodes: Binding['nodes'],
  ids: { id: string; target: string },
): void {
  if (alreadyMapped(nodes, ids)) return;
  const source = required(pair.master.nodes.find((node) => node.id === ids.id));
  const copy = required(pair.copy.nodes.find((node) => node.id === ids.target));

  if (sameRole(source, copy)) nodes[ids.id] = copy.id;
}

function freeIcons(
  icons: DesignNode[] | undefined,
  nodes: Binding['nodes'],
): DesignNode[] {
  const used = new Set(Object.values(nodes));

  return (icons ?? []).filter((icon) => !used.has(icon.id));
}

function mapIcon(
  source: DesignNode,
  matches: DesignNode[],
  nodes: Binding['nodes'],
): void {
  if (!nodes[source.id] && matches.length === 1)
    nodes[source.id] = required(matches[0]).id;
}

function mapIcons(pair: Pair, nodes: Binding['nodes']): void {
  const icons = iconGroups(pair.copy);

  for (const [name, source] of iconSlots(pair.master))
    mapIcon(source, freeIcons(icons.get(name), nodes), nodes);
}

export function mapNodes(
  master: Snapshot,
  copy: Snapshot,
  nodes: Binding['nodes'],
): void {
  const pair = { master, copy };
  mapIcons(pair, nodes);

  for (const source of master.nodes) alignedChildren(source, pair, nodes);

  for (const source of master.nodes.filter((node) => !nodes[node.id]))
    mapSource(source, pair, nodes);
}

function bothNested(source: DesignNode, node: DesignNode): boolean {
  return Boolean(source.nested && node.nested);
}

function alreadyMapped(
  nodes: Binding['nodes'],
  ids: { id: string; target: string },
): boolean {
  return Boolean(nodes[ids.id] || Object.values(nodes).includes(ids.target));
}
