import type { ChangeStageProps } from './change-stage';

export const workingChange = { stage: 'working' } satisfies ChangeStageProps;

export const branchChange = { stage: 'branch' } satisfies ChangeStageProps;

export const openChange = { stage: 'open' } satisfies ChangeStageProps;

export const mergedChange = { stage: 'merged' } satisfies ChangeStageProps;

export const closedChange = { stage: 'closed' } satisfies ChangeStageProps;

export const draftChange = {
  stage: 'open',
  modifier: 'draft',
} satisfies ChangeStageProps;

export const conflictChange = {
  stage: 'open',
  modifier: 'conflict',
} satisfies ChangeStageProps;

export const discChange = {
  ...openChange,
  form: 'disc',
} satisfies ChangeStageProps;

export const numberedChange = {
  ...openChange,
  number: 45,
} satisfies ChangeStageProps;
