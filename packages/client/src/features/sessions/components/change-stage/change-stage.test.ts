import { expect, it } from 'vitest';
import { changeDescription, resolveChangeStage } from './change-stage-model';

it('marks a draft Change that also conflicts as a draft', () => {
  const both = { stage: 'open', modifiers: ['conflict', 'draft'] } as const;

  expect(resolveChangeStage(both)).toMatchObject({ icon: 'pr-draft' });
  expect(changeDescription(both)).toBe('Draft');
});
