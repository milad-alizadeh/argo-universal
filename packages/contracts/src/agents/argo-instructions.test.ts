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

it('asks the Agent to declare the role of each Agent it spawns', () => {
  const agents = argoInstructions.find(({ name }) => name === 'Agents');

  expect(agents?.text).toContain('session.declareSubagentRole');
});
