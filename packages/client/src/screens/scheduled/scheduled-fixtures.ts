import type {
  ProjectSchedule,
  ProjectScheduleHistoryEntry,
} from '@repo/contracts/operations';
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
  paused: false,
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

export const pausedSchedule: ProjectSchedule = {
  ...latestSchedule,
  id: 'schedule-paused',
  name: 'Audit flaky tests',
  paused: true,
};

export const scheduledListFixture = {
  schedules: [firstSchedule, latestSchedule, pausedSchedule],
  selectedId: firstSchedule.id,
};

export const scheduleHistoryFixture: readonly ProjectScheduleHistoryEntry[] = [
  {
    id: 'occurrence-new',
    occurrence: {
      at: Date.UTC(2026, 10, 21, 14),
      outcome: 'started',
      sessionId: 'latest-session',
    },
  },
  {
    id: 'occurrence-skipped',
    occurrence: {
      at: Date.UTC(2026, 10, 21, 13),
      outcome: 'skipped',
      reason: 'The Server was offline when this Schedule was due.',
    },
  },
  {
    id: 'occurrence-older',
    occurrence: {
      at: Date.UTC(2026, 10, 21, 12),
      outcome: 'started',
      sessionId: 'earlier-session',
    },
  },
];
