import { expect, it } from 'vitest';
import { planStories } from './story-job-plan.mts';

const interaction = 'packages/kit/src/widget.test.stories.tsx';
const render = 'packages/client/src/view.stories.tsx';
const fixture = 'packages/kit/src/fixture.ts';
const inventory = [interaction, render].map((file) => ({ file, weight: 2 }));

it('proposes one runner for a single interaction file', () => {
  expect(
    planStories(inventory, [interaction], () => [interaction]).matrix,
  ).toEqual([{ suite: 'interaction', files: [interaction] }]);
});

it('emits no empty shards for a docs-only change', () => {
  expect(planStories(inventory, ['docs/guide.md'], () => []).matrix).toEqual(
    [],
  );
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
  [undefined, () => []],
  [['apps/storybook/.storybook/preview.tsx'], () => []],
  [[fixture], () => []],
  [
    [fixture],
    () => {
      throw Error('list failed');
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
