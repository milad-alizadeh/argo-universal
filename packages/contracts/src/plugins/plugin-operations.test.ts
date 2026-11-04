import { expect, it } from 'vitest';
import { PluginOperationContribution } from './plugin-operations';

const operation = {
  name: 'setStatus',
  label: 'Set Issue status',
  description: 'Close or reopen one Issue.',
  tier: 'act',
};

const param = { type: 'string', description: 'open or closed.' };

it('takes a string param with its choices and an Operation that needs a Project', () => {
  expect(
    PluginOperationContribution.safeParse({
      ...operation,
      params: { status: { ...param, choices: ['open', 'closed'] } },
      caller: ['project'],
    }).success,
  ).toBe(true);
});

const refused: [string, object][] = [
  [
    'choices on a number param',
    { type: 'number', description: 'n', choices: ['1'] },
  ],
  ['a choice listed twice', { ...param, choices: ['open', 'open'] }],
];

it.each(refused)('refuses %s', (_name, given) => {
  expect(
    PluginOperationContribution.safeParse({
      ...operation,
      params: { status: given },
    }).success,
  ).toBe(false);
});

it('refuses a projectId param, which core gives an Operation that needs a Project', () => {
  expect(
    PluginOperationContribution.safeParse({
      ...operation,
      params: { projectId: param },
    }).success,
  ).toBe(false);
});
