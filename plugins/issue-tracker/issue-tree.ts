import type { Issue } from './github-issues';

// An Issue with the sub-Issues the loaded page holds under it.
export type IssueNode = { issue: Issue; children: IssueNode[] };

type Nodes = ReadonlyMap<number, IssueNode>;

/*
 * The page's Issues as a tree, in GitHub's order. An Issue nests under its parent only when that parent is in the
 * same page; one whose parent is not loaded stays top-level, as does any Issue in a parent cycle.
 */
export function issueTree(issues: readonly Issue[]): IssueNode[] {
  const nodes = new Map(issues.map(leaf));

  return [...nodes.values()].filter((node) => !adopt(nodes, node));
}

const leaf = (issue: Issue): [number, IssueNode] => [
  issue.number,
  { issue, children: [] },
];

// Puts the node under its parent, and says whether it had one.
function adopt(nodes: Nodes, node: IssueNode): boolean {
  const parent = parentNode(nodes, node);

  parent?.children.push(node);

  return parent !== undefined;
}

const lookup = (
  nodes: Nodes,
  number: number | undefined,
): IssueNode | undefined =>
  number === undefined ? undefined : nodes.get(number);

// The node's parent, unless nesting under it would close a loop.
function parentNode(nodes: Nodes, node: IssueNode): IssueNode | undefined {
  const parent = lookup(nodes, node.issue.parent);

  return parent && !lineage(nodes, parent).has(node.issue.number)
    ? parent
    : undefined;
}

// The numbers of a node and each ancestor above it, stopping at a repeat.
function lineage(nodes: Nodes, start: IssueNode): Set<number> {
  const seen = new Set<number>();
  let current: IssueNode | undefined = start;

  while (current && !seen.has(current.issue.number)) {
    seen.add(current.issue.number);
    current = lookup(nodes, current.issue.parent);
  }

  return seen;
}
