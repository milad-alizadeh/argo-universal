import { expect, it } from 'vitest';
import { checkoutName, modelName } from './configuration-values';
import { modeIcon } from './mode-icon';

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

// Claude's ACP modes arrive without Argo's icon metadata; each still gets its own icon.
it.each([
  ['default', 'permission'],
  ['acceptEdits', 'edit'],
  ['plan', 'plan-mode'],
  ['auto', 'sparkle'],
  ['bypassPermissions', 'warning'],
  ['unknown-mode', 'permission'],
])('draws mode %j with the %j icon', (value, expected) => {
  expect(modeIcon({ value, name: value })).toBe(expected);
});

it("prefers the Agent's own mode icon over the value's", () => {
  expect(
    modeIcon({
      value: 'default',
      name: 'Plan',
      _meta: { argo: { icon: 'MapTrifold' } },
    }),
  ).toBe('plan-mode');
});
