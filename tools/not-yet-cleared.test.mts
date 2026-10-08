import { expect, it } from 'vitest';
import {
  current,
  exampleFilename,
  folder,
  report,
} from './not-yet-cleared.mocks.mts';
import { evaluateWaivers } from './not-yet-cleared/evaluate.mts';

it('counts only files directly in a folder', (): void => {
  const measured =
    '{"diagnostics":[{"filename":"packages/example/src/nested/example.ts","code":"eslint(complexity)"}]}';
  expect(
    evaluateWaivers({ current, baseline: current, report: measured }).entries[0]
      ?.findings,
  ).toBe(0);
});

it.each([
  'typescript(explicit-function-return-type)',
  'typescript/explicit-function-return-type',
])('recognizes rule code %s', (code): void => {
  const text =
    '{"overrides":[{"files":["packages/example/src/*"],"rules":{"typescript/explicit-function-return-type":"off"}}]}';
  const measured = JSON.stringify({
    diagnostics: [{ filename: exampleFilename, code }],
  });
  expect(
    evaluateWaivers({ current: text, baseline: text, report: measured })
      .problems,
  ).toEqual([]);
});

it('accepts an unchanged waiver with a finding', (): void => {
  expect(evaluateWaivers({ current, baseline: current, report })).toEqual({
    problems: [],
    entries: [{ glob: folder, findings: 1, rules: 1 }],
    pruned: current,
  });
});

it.each([
  {
    rules: { complexity: 'off', 'max-depth': 'off' },
    problem: `${folder}: added rule max-depth`,
  },
  {
    glob: 'packages/extra/*',
    problem: 'packages/extra/*: added entry or changed glob',
  },
  {
    glob: 'packages/example/src/**',
    problem: 'packages/example/src/**: added entry or changed glob',
  },
])('rejects growth: $problem', (fixture): void => {
  const changed = JSON.stringify({
    overrides: [
      {
        files: [fixture.glob ?? folder],
        rules: fixture.rules ?? { complexity: 'off' },
      },
    ],
  });
  expect(
    evaluateWaivers({ current: changed, baseline: current, report }).problems,
  ).toContain(fixture.problem);
});
