import type { ProjectSchedule } from '@repo/contracts/operations';
import { scheduleCadenceDraft } from './schedule-cadence-draft';
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
} satisfies Omit<ScheduleFormViewProps, 'onSubmit' | 'timing'>;

const london = 'Europe/London';

export const weekdaysDraft = scheduleCadenceDraft({
  type: 'weekdays',
  localTime: '09:00',
  timeZone: london,
});

export const customWeeksDraft = scheduleCadenceDraft({
  type: 'custom',
  every: 2,
  unit: 'week',
  weekdays: ['monday', 'thursday'],
  localTime: '09:00',
  timeZone: london,
});

export const weekdaysTiming = {
  draft: weekdaysDraft,
  nextRun: 'Mon, 23 Nov at 09:00',
};

export const customWeeksTiming = {
  draft: customWeeksDraft,
  nextRun: 'Thu, 26 Nov at 09:00',
};

export const firstSchedule = {
  id: 'review-build',
  name: 'Review the build',
  instructions:
    'Review the build and summarize any failures with links to the logs.',
  projectId: 'argo',
  agent: 'agent-1',
  configOptions: [],
  checkout: { type: 'worktree', baseBranch: 'main' },
  cadence: { type: 'weekdays', localTime: '09:00', timeZone: london },
  nextAt: Date.UTC(2026, 10, 21, 14),
  latestSessionId: null,
} satisfies ProjectSchedule;

export const latestSchedule = {
  ...firstSchedule,
  id: 'review-changes',
  name: 'Review recent changes',
  instructions: 'Review recent changes and flag regressions.',
  cadence: { type: 'interval', intervalSeconds: 1800 },
  latestSessionId: 'latest-session',
} satisfies ProjectSchedule;

export const scheduledListFixture = {
  schedules: [firstSchedule, latestSchedule],
  selectedId: firstSchedule.id,
};
