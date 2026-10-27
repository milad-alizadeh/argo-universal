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
