import type { ProjectSchedule } from '@repo/contracts/operations';
import type { ScheduleFormViewProps } from './schedule-form-view';

export const scheduleFormFixture = {
  projects: [
    { value: 'argo', label: 'Argo Universal' },
    { value: 'design', label: 'Design System' },
  ],
  agents: [
    { value: 'agent-1', label: 'Agent 1' },
    { value: 'agent-2', label: 'Agent 2' },
  ],
  branches: [
    { value: 'main', label: 'main' },
    { value: 'preview', label: 'preview' },
  ],
  currentBranch: 'main',
  initialProjectId: 'argo',
} satisfies Omit<ScheduleFormViewProps, 'onSubmit'>;

export const firstSchedule = {
  id: 'review-build',
  name: 'Review the build',
  instructions:
    'Review the build and summarize any failures with links to the logs.',
  projectId: 'argo',
  agent: 'agent-1',
  configOptions: [],
  checkout: { type: 'worktree', baseBranch: 'main' },
  intervalSeconds: 3600,
  nextAt: Date.UTC(2026, 10, 21, 14),
  latestSessionId: null,
} satisfies ProjectSchedule;

export const latestSchedule = {
  ...firstSchedule,
  id: 'review-changes',
  name: 'Review recent changes',
  instructions: 'Review recent changes and flag regressions.',
  intervalSeconds: 1800,
  latestSessionId: 'latest-session',
} satisfies ProjectSchedule;

export const scheduledListFixture = {
  schedules: [firstSchedule, latestSchedule],
  selectedId: firstSchedule.id,
};
