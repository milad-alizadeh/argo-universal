import { codeName, key, location, nodeMap, type Catalog } from './catalog.mts';
import type { Enrollment, Exclusion } from './enrollment-model.mts';
import type { LocatedNode } from './index-model.mts';
import type { Binding } from './model.mts';

type CopyLocation = {
  nodeId: string;
  fileId: string;
  page: string;
  board: string;
  flow: string;
};

export type MasterReport = {
  name: string;
  fileId: string;
  nodeId: string;
  copies: CopyLocation[];
};

function copyLocation(copy: Binding): CopyLocation {
  const fallback = { fileId: copy.fileId, page: '?', board: '?', flow: '?' };

  return { nodeId: copy.nodeId, ...(copy.location ?? fallback) };
}

export function masterReports(
  catalog: Catalog,
  result: Enrollment,
): MasterReport[] {
  return catalog.masters.map((master) => masterReport(master, result));
}

function masterReport(master: LocatedNode, result: Enrollment): MasterReport {
  const family = result.registry.families.find(
    (item) => item.name === master.name,
  );

  const copies = family?.copies ?? [];

  return {
    name: master.name,
    fileId: master.fileId,
    nodeId: master.id,
    copies: copies.map(copyLocation),
  };
}

function matchingNode(node: LocatedNode, families: Set<string>): boolean {
  if (node.component === 'Text') return false;
  const name = codeName(node.name);

  return name !== undefined && families.has(name);
}

function exclusion(
  node: LocatedNode,
  context: {
    catalog: Catalog;
    result: Enrollment;
    index: Map<string, LocatedNode>;
  },
): Exclusion {
  const error = context.result.excluded.find(
    (item) => item.fileId === node.fileId && item.nodeId === node.id,
  );

  const reason = error?.reason ?? 'No unique exact master name';

  const identity = { fileId: node.fileId, nodeId: node.id, name: node.name };

  return { ...identity, location: location(node, context.index), reason };
}

export function unenrolled(catalog: Catalog, result: Enrollment): Exclusion[] {
  const linked = new Set(
    result.registry.families.flatMap((family) =>
      family.copies.map((copy) => `${copy.fileId}:${copy.nodeId}`),
    ),
  );

  for (const master of catalog.masters) linked.add(key(master));
  const index = nodeMap(catalog.nodes);

  const matches = catalog.nodes.filter((node) =>
    matchingNode(node, catalog.families),
  );

  return matches.flatMap((node) =>
    linked.has(key(node)) ? [] : [exclusion(node, { catalog, result, index })],
  );
}
