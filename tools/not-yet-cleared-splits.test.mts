import { expect, it } from 'vitest';
import { evaluateWaivers } from './not-yet-cleared/evaluate.mts';

const components = 'packages/client/src/components/*';
const feedComponents = 'packages/client/src/features/feed/components/*';
const frameComponents = 'packages/client/src/features/frame/components/*';
const oldLib = 'packages/client/src/lib/*';
const oldNavigation = 'packages/client/src/navigation/*';
const generic = 'packages/client/src/lib/generic/*';
const complexityCode = 'eslint(complexity)';
type Rules = Record<string, 'off'>;

const waivers = (entries: [string, Rules][]): string =>
  JSON.stringify({
    overrides: entries.map(([glob, rules]) => ({ files: [glob], rules })),
  });
const findings = (entries: [string, string][]): string =>
  JSON.stringify({
    diagnostics: entries.map(([glob, code]) => ({
      filename: glob.replace('*', 'example.tsx'),
      code,
    })),
  });

it('accepts one folder split into its listed feature folders', (): void => {
  expect(
    evaluateWaivers({
      current: waivers([
        [feedComponents, { complexity: 'off' }],
        [frameComponents, { 'max-lines': 'off' }],
      ]),
      baseline: waivers([
        [components, { complexity: 'off', 'max-lines': 'off' }],
      ]),
      report: findings([
        [feedComponents, complexityCode],
        [frameComponents, 'eslint(max-lines)'],
      ]),
    }).problems,
  ).toEqual([]);
});

it('accepts listed folders merged into one, within their rules', (): void => {
  expect(
    evaluateWaivers({
      current: waivers([
        [generic, { complexity: 'off', 'max-lines-per-function': 'off' }],
      ]),
      baseline: waivers([
        [oldLib, { complexity: 'off' }],
        [oldNavigation, { 'max-lines-per-function': 'off' }],
      ]),
      report: findings([
        [generic, complexityCode],
        [generic, 'eslint(max-lines-per-function)'],
      ]),
    }).problems,
  ).toEqual([]);
});

it('rejects a rule that no source folder waived', (): void => {
  expect(
    evaluateWaivers({
      current: waivers([[feedComponents, { 'max-depth': 'off' }]]),
      baseline: waivers([[components, { complexity: 'off' }]]),
      report: findings([[feedComponents, 'eslint(max-depth)']]),
    }).problems,
  ).toEqual([`${feedComponents}: added rule max-depth`]);
});

it('compares a split folder with itself once it is the baseline', (): void => {
  expect(
    evaluateWaivers({
      current: waivers([[feedComponents, { 'max-lines': 'off' }]]),
      baseline: waivers([[feedComponents, { complexity: 'off' }]]),
      report: findings([[feedComponents, 'eslint(max-lines)']]),
    }).problems,
  ).toEqual([`${feedComponents}: added rule max-lines`]);
});

it.each([
  [components, feedComponents],
  [feedComponents, components],
])(
  'rejects an old folder beside its split folder: %s, %s',
  (first, second): void => {
    expect(
      evaluateWaivers({
        current: waivers([
          [first, { complexity: 'off' }],
          [second, { complexity: 'off' }],
        ]),
        baseline: waivers([[components, { complexity: 'off' }]]),
        report: findings([
          [first, complexityCode],
          [second, complexityCode],
        ]),
      }).problems,
    ).toEqual([`${second}: duplicate historical waiver identity`]);
  },
);
