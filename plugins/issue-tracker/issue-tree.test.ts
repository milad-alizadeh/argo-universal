import { expect, it } from 'vitest';
import type { Issue } from './github-issues';
import { issueTree, type IssueNode } from './issue-tree';

const issue = (number: number, parent?: number): Issue => {
  const page: Issue = {
    number,
    title: `Issue ${number}`,
    status: 'open',
    body: '',
    url: `https://github.com/argo/app/issues/${number}`,
    labels: [],
    assignees: [],
  };

  if (parent !== undefined) page.parent = parent;

  return page;
};

// Nodes as numbers: its own, then its children's.
const nested = (nodes: IssueNode[]): unknown[] =>
  nodes.map(({ issue: { number }, children }) =>
    children.length ? [number, nested(children)] : number,
  );

it('nests sub-Issues under their parent at any depth, in the page order', () => {
  const tree = issueTree([
    issue(1),
    issue(2, 1),
    issue(3, 2),
    issue(4, 1),
    issue(5),
  ]);

  expect(nested(tree)).toEqual([[1, [[2, [3]], 4]], 5]);
});

it('keeps an Issue top-level when its parent is not in the page', () => {
  const tree = issueTree([issue(7, 99), issue(8, 7)]);

  expect(nested(tree)).toEqual([[7, [8]]]);
});

it('nests a child that comes before its parent', () => {
  expect(nested(issueTree([issue(2, 1), issue(1)]))).toEqual([[1, [2]]]);
});

it('keeps every Issue of a parent cycle top-level rather than looping', () => {
  expect(nested(issueTree([issue(1, 2), issue(2, 1)]))).toEqual([1, 2]);
});
