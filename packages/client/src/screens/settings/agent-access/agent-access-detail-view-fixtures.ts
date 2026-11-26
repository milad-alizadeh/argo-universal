import type { OperationGrant } from '@repo/contracts/operations';

export const scheduleGrant: OperationGrant = {
  projectId: 'argo',
  projectName: 'argo-universal',
  operationId: 'session.schedulePrompt',
  label: 'Schedule Prompt',
  targetProjectId: 'support-bot',
  targetProjectName: 'support-bot',
  createdAt: 1_795_600_000_000,
};

const runNowGrant: OperationGrant = {
  projectId: 'argo',
  projectName: 'argo-universal',
  operationId: 'project.scheduleRunNow',
  label: 'Run Project Schedule now',
  targetProjectId: 'arena-mobile',
  targetProjectName: 'arena-mobile',
  createdAt: 1_795_600_100_000,
};

export const alwaysAllowed: OperationGrant[] = [scheduleGrant, runNowGrant];
