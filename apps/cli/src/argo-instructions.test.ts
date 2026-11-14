import { pluginInstructionsLimit } from '@repo/contracts/plugins/manifest-fields';
import { expect, it } from 'vitest';
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
