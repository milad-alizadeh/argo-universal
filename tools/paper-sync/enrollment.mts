import { enroll } from './bind.mts';
import type { PaperClient } from './client.mts';
import type { IndexedNode } from './discover.mts';
import type { Registry } from './model.mts';
import { readSnapshot } from './read.mts';

export const foundations = '01M4RJ2FP7N272AE463G6PT2QD';
export const composer = '01M4RJXN4XTK41J7TDNBBD87G1';
export const buttonCard = '1V7-0';
export const buttonName = /^Button(?: \([^)]*\))?\s*\//;

function inside(
  node: IndexedNode,
  ancestor: string,
  nodes: IndexedNode[],
): boolean {
  let current: IndexedNode | undefined = node;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    if (current.id === ancestor) return true;
    visited.add(current.id);
    current = nodes.find((candidate) => candidate.id === current?.parentId);
  }
  return false;
}

export async function enrollButtons(
  client: PaperClient,
  indices: Map<string, IndexedNode[]>,
  previous: Registry,
): Promise<{ registry: Registry; excluded: object[] }> {
  const nodes = indices.get(foundations);
  if (!nodes) throw new Error('Missing Foundations inventory');
  const masters = nodes.filter(
    (node) =>
      buttonName.test(node.name) &&
      inside(node, buttonCard, nodes) &&
      !/not applicable|not drawn/.test(node.name),
  );
  if (
    !masters.length ||
    new Set(masters.map((node) => node.name)).size !== masters.length
  )
    throw new Error('Missing or ambiguous Button masters');
  const registry: Registry = { version: 1, families: [] };
  const excluded: object[] = [];
  for (const master of masters) {
    const source = await readSnapshot(client, foundations, master.id);
    const family: Registry['families'][number] = {
      name: master.name,
      master: { fileId: foundations, nodeId: master.id },
      copies: [],
    };
    for (const [fileId, index] of indices)
      for (const candidate of index.filter(
        (node) =>
          node.name === master.name &&
          !(fileId === foundations && inside(node, buttonCard, index)),
      )) {
        const prior = previous.families
          .find((item) => item.master.nodeId === master.id)
          ?.copies.find(
            (item) => item.fileId === fileId && item.nodeId === candidate.id,
          );
        if (prior) {
          family.copies.push(prior);
          continue;
        }
        try {
          family.copies.push(
            enroll(source, await readSnapshot(client, fileId, candidate.id)),
          );
        } catch (error) {
          excluded.push({ fileId, ...candidate, reason: String(error) });
        }
      }
    registry.families.push(family);
    console.log(`Enrolled ${family.name}: ${family.copies.length} copies`);
  }
  for (const [fileId, index] of indices)
    for (const node of index) {
      if (
        buttonName.test(node.name) &&
        !masters.some((master) => master.name === node.name)
      )
        excluded.push({
          fileId,
          ...node,
          reason: 'No exact canonical Button state',
        });
    }
  return { registry, excluded };
}
