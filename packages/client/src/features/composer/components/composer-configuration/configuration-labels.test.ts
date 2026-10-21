import type { SessionConfigOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  checkoutName,
  modelName,
  otherSelections,
} from './configuration-values';

it.each([
  ['Model', 'Model'],
  ['Model (recommended)', 'Model'],
  ['Model   (ReCoMmEnDeD) \t', 'Model'],
  ['Model\n(recommended)\n', 'Model'],
  ['Model (recommended) extra', 'Model (recommended) extra'],
  ['Model  ', 'Model  '],
  ['(recommended)', ''],
])('displays model label %j as %j', (name, expected) => {
  expect(modelName({ value: 'model', name })).toBe(expected);
});

it('uses the Agent short name before its full model label', () => {
  expect(
    modelName({
      value: 'model',
      name: 'Model (recommended)',
      _meta: { argo: { shortName: 'Short' } },
    }),
  ).toBe('Short');
});

it('has no model label without a choice', () => {
  expect(modelName()).toBe('');
});

it.each([
  ['/work/project///', 'project'],
  ['C:\\work\\project\\', 'project'],
  ['/work/project', 'project'],
  ['///', 'branch'],
  [undefined, 'branch'],
  ['', 'branch'],
])('displays worktree path %j as %j', (path, expected) => {
  expect(checkoutName({ newWorktree: true, branch: 'Branch', path })).toBe(
    expected,
  );
});

it('labels a Local Checkout independently of its path', () => {
  expect(
    checkoutName({
      newWorktree: false,
      branch: 'Branch',
      path: '/work/project',
    }),
  ).toBe('Local');
});

const selectOption = (
  configId: string,
  category?: string,
): SessionConfigOption => ({
  configId,
  name: configId,
  type: 'select',
  currentValue: 'one',
  category,
  options: [{ value: 'one', name: 'One' }],
});

it('leaves Claude Code’s Agent persona out of the plain rows', () => {
  const configOptions = [
    selectOption('agent'),
    selectOption('verbosity'),
    selectOption('model', 'model'),
  ];

  expect(otherSelections({ configOptions }).map((o) => o.configId)).toEqual([
    'verbosity',
  ]);
});
