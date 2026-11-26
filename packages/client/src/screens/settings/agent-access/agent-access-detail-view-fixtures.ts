import type { OperationGrant } from '@repo/contracts/operations';

export const scheduleGrant: OperationGrant = {
  projectId: 'argo',
  projectName: 'argo-universal',
  operationId: 'session.schedulePrompt',
  label: 'Schedule Prompt',
  createdAt: 1_795_600_000_000,
};

const savePlanGrant: OperationGrant = {
  projectId: 'support-bot',
  projectName: 'support-bot',
  operationId: 'session.savePlan',
  label: 'Save Written plan',
  createdAt: 1_795_600_100_000,
};

export const alwaysAllowed: OperationGrant[] = [scheduleGrant, savePlanGrant];
