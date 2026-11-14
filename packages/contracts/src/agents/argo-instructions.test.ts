import { expect, it } from 'vitest';
import { pluginInstructionsLimit } from '../plugins/manifest-fields';
import { argoInstructions } from './argo-instructions';

it('keeps each Argo instruction within the Plugin instructions limit', () => {
  const over = argoInstructions.filter(
    ({ text }) => text.length > pluginInstructionsLimit,
  );

  expect(over).toEqual([]);
});

it('asks the Agent to keep a Plan', () => {
  expect(argoInstructions.map(({ name }) => name)).toContain('Plan');
});

// Claude Code defers its task tools behind ToolSearch, and an unnamed tool went unused.
it('names the checklist tool of each Agent the Plan reaches', () => {
  const plan = argoInstructions.find(({ name }) => name === 'Plan')?.text;

  for (const tool of ['TaskCreate', 'TodoWrite', 'update_plan', 'ToolSearch'])
    expect(plan).toContain(tool);
});
