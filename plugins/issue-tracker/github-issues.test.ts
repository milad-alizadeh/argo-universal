import { expect, it } from 'vitest';
import { mapIssue, type GitHubIssue } from './github-issues';

const issue = (fields: Partial<GitHubIssue>): GitHubIssue => ({
  number: 8,
  title: 'Keep the Plugin boundary',
  state: 'OPEN',
  url: 'https://github.com/argo/app/issues/8',
  ...fields,
});

it('maps a parent to its number', () => {
  expect(mapIssue(issue({ parent: { number: 3 } })).parent).toBe(3);
});

it.each([
  ['null', null],
  ['an empty object', {}],
  ['a non-numeric number', { number: 'x' }],
  ['a zero number', { number: 0 }],
] as const)('maps %s to no parent', (_name, parent) => {
  expect(mapIssue(issue({ parent })).parent).toBeUndefined();
});

it.each([
  ['COMPLETED', 'completed'],
  ['NOT_PLANNED', 'not-planned'],
  ['DUPLICATE', 'not-planned'],
] as const)('maps a closed Issue with reason %s to %s', (reason, closedAs) => {
  expect(
    mapIssue(issue({ state: 'CLOSED', stateReason: reason })).closedAs,
  ).toBe(closedAs);
});

it('names no reason for an open Issue or one GitHub did not explain', () => {
  expect(mapIssue(issue({ stateReason: 'REOPENED' })).closedAs).toBeUndefined();
  expect(
    mapIssue(issue({ state: 'CLOSED', stateReason: 'SURPRISE' })).closedAs,
  ).toBeUndefined();
});

const relation = (number: number, state: 'OPEN' | 'CLOSED'): GitHubIssue => ({
  number,
  title: `Issue ${number}`,
  state,
  url: `https://github.com/argo/app/issues/${number}`,
});

it('maps blockers and sub-Issues, closed ones included', () => {
  const mapped = mapIssue(
    issue({
      blockedBy: { nodes: [relation(3, 'OPEN')] },
      subIssues: { nodes: [relation(4, 'CLOSED'), relation(5, 'OPEN')] },
    }),
  );

  expect(mapped.blockedBy).toEqual([
    {
      number: 3,
      title: 'Issue 3',
      status: 'open',
      url: 'https://github.com/argo/app/issues/3',
    },
  ]);
  expect(mapped.children?.map((child) => child.status)).toEqual([
    'closed',
    'open',
  ]);
});

it('leaves out a relation GitHub reported empty', () => {
  const mapped = mapIssue(
    issue({ blockedBy: { nodes: [] }, subIssues: { nodes: [{}] } }),
  );

  expect(mapped.blockedBy).toBeUndefined();
  expect(mapped.children).toBeUndefined();
});

it('takes the sub-Issue tally from GitHub', () => {
  expect(
    mapIssue(issue({ subIssuesSummary: { completed: 27, total: 38 } }))
      .progress,
  ).toEqual({ completed: 27, total: 38 });
});

it.each([
  ['no sub-Issues', { completed: 0, total: 0 }],
  ['a missing total', { completed: 2 }],
  ['a non-numeric tally', { completed: 'x', total: 'y' }],
] as const)('names no progress for %s', (_name, summary) => {
  expect(
    mapIssue(issue({ subIssuesSummary: summary })).progress,
  ).toBeUndefined();
});
