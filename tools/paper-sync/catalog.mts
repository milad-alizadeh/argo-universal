import type { LocatedNode, PageIndex } from './index-model.mts';
import { ancestors, nodeMap } from './locations.mts';
import { required } from './model.mts';

export {
  ancestors,
  key,
  nodeMap,
  location,
  type Location,
} from './locations.mts';

export type Catalog = {
  nodes: LocatedNode[];
  masters: LocatedNode[];
  duplicates: LocatedNode[][];
  families: Set<string>;
};

export function codeName(name: string): string | undefined {
  return /^([A-Z][A-Za-z0-9]*)(?: \((?:ios|android|phone)\))?(?: \/ .+)?$/.exec(
    name,
  )?.[1];
}

function cardFamily(name: string): string | undefined {
  return /^Components \/ ([A-Z][A-Za-z0-9]*)(?:$|[ (·])/.exec(name)?.[1];
}

function belongsToCard(node: LocatedNode, parents: LocatedNode[]): boolean {
  const card = parents.find((parent) =>
    parent.name.startsWith('Components / '),
  );

  if (!card) return false;
  const family = codeName(node.name);

  if (cardFamily(card.name) !== family) return false;

  return !parents
    .slice(0, parents.indexOf(card))
    .some((parent) => codeName(parent.name) === family);
}

function isMaster(node: LocatedNode, index: Map<string, LocatedNode>): boolean {
  if (node.component === 'Text') return false;

  if (!codeName(node.name)) return false;

  return belongsToCard(node, ancestors(node, index));
}

function groups(masters: LocatedNode[]): LocatedNode[][] {
  const names = new Map<string, LocatedNode[]>();

  for (const master of masters)
    names.set(master.name, [...(names.get(master.name) ?? []), master]);

  return [...names.values()];
}

function locate(page: PageIndex): LocatedNode[] {
  return page.nodes.map((node) => ({
    ...node,
    fileId: page.fileId,
    pageId: page.pageId,
    pageName: page.pageName,
  }));
}

export function discover(pages: PageIndex[]): Catalog {
  const nodes = pages.flatMap(locate);
  const index = nodeMap(nodes);
  const candidates = groups(nodes.filter((node) => isMaster(node, index)));

  const masters = candidates.flatMap((group) =>
    group.length === 1 ? [required(group[0])] : [],
  );

  const names = candidates.map((group) => codeName(required(group[0]).name));

  return {
    nodes,
    masters,
    duplicates: candidates.filter((group) => group.length > 1),
    families: new Set(names.filter((name) => name !== undefined)),
  };
}
