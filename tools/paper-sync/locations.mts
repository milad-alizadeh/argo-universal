import type { LocatedNode } from './index-model.mts';

export type Location = {
  fileId: string;
  page: string;
  board: string;
  flow: string;
};

export function key(node: { fileId: string; id: string }): string {
  return `${node.fileId}:${node.id}`;
}

export function nodeMap(nodes: LocatedNode[]): Map<string, LocatedNode> {
  return new Map(nodes.map((node) => [key(node), node]));
}

export function ancestors(
  node: LocatedNode,
  index: Map<string, LocatedNode>,
): LocatedNode[] {
  const result: LocatedNode[] = [];
  const seen = new Set<string>([node.id]);
  let parent = index.get(`${node.fileId}:${node.parentId}`);

  while (parent && !seen.has(parent.id)) {
    result.push(parent);
    seen.add(parent.id);
    parent = index.get(`${parent.fileId}:${parent.parentId}`);
  }

  return result;
}

function flowName(parents: LocatedNode[], fallback: string): string {
  const flow = parents.find((parent) => parent.name.startsWith('Flow / '));

  return flow?.name ?? fallback;
}

export function location(
  node: LocatedNode,
  index: Map<string, LocatedNode>,
): Location {
  const parents = containers(node, index);

  const board = nodeName(parents[0], node.name);
  const fallback = nodeName(parents[1], node.name);

  const page = node.pageName;

  return {
    fileId: node.fileId,
    page,
    board,
    flow: flowName(parents, fallback),
  };
}

function nodeName(node: LocatedNode | undefined, fallback: string): string {
  return node?.name ?? fallback;
}

function containers(
  node: LocatedNode,
  index: Map<string, LocatedNode>,
): LocatedNode[] {
  return ancestors(node, index)
    .reverse()
    .filter((parent) => parent.component !== 'Page');
}
