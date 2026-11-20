import { expect, it } from 'vitest';
import { planStories } from './story-job-plan.mts';

const interaction = 'packages/kit/src/primitives/widget.test.stories.tsx';

const render = 'packages/client/src/screens/view.stories.tsx';

const fixture = 'packages/kit/src/primitives/fixture.ts';

const inventory = [interaction, render].map((file) => ({ file, weight: 2 }));

it('proposes one runner for a single interaction file', () => {
  expect(
    planStories(inventory, [interaction], () => [interaction]).matrix,
  ).toEqual([{ suite: 'interaction', files: [interaction] }]);
});

it('emits no empty shards for a docs-only change', () => {
  expect(
    planStories(inventory, ['docs/guide.md'], (): string[] => []).matrix,
  ).toEqual([]);
});

it('assigns all dependents of a fixture exactly once', () => {
  expect(
    planStories(inventory, [fixture], () => [interaction, render, render])
      .matrix,
  ).toEqual([
    { suite: 'interaction', files: [interaction] },
    { suite: 'render', files: [render] },
  ]);
});

it.each([
  [undefined, (): string[] => []],
  [['apps/storybook/.storybook/preview.tsx'], (): string[] => []],
  [[fixture], (): string[] => []],
  [
    [fixture],
    (): never => {
      throw new Error('list failed');
    },
  ],
] as const)('retains both full suites on uncertainty', (changed, list) => {
  const plan = planStories(inventory, changed && [...changed], list);
  expect(plan.mode).toBe('full');
  expect(plan.matrix.flatMap((row) => row.files)).toEqual([
    interaction,
    render,
  ]);
});

it('shares one runner when a fixture and its story change together', () => {
  expect(
    planStories(inventory, [fixture, interaction], () => [interaction]).jobs,
  ).toBe(1);
});

it('keeps all shards for the shared preview even with a partial listing', () => {
  expect(
    planStories(inventory, ['packages/client/src/preview-config.ts'], () => [
      interaction,
    ]).mode,
  ).toBe('full');
});
