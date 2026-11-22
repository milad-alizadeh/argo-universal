import type { WireNode } from '@repo/contracts/plugins/wire';
import { Text } from '@repo/kit/primitives/content/text';
import type { ScheduleControls } from '#features/sessions';
import { severalPullRequests } from '../../../features/sessions/components/session-pull-request.mocks';
import {
  sessionShells,
  shellNow,
} from '../../../features/sessions/components/shell-list/shell-list.mocks';
import {
  subagentNow,
  subagentStates,
} from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionPluginCard } from './sections/plugin-card-section';
import { detachableIssuesBar } from './session-detail-view-bar.mocks';
import type { SessionInspectorContent } from './session-inspector-content';
import { runActions } from './session-run-inspector-fixtures';

const noop = (): void => {};

const later = async (): Promise<void> => {};

type Schedule = ScheduleControls['items'][number];

const followUp = (id: string, text: string, at: number): Schedule => ({
  id,
  sessionId: 'session',
  intervalSeconds: 300,
  state: 'active',
  endsAt: null,
  paused: false,
  lastQueuedAt: null,
  nextAt: at,
  prompt: [{ type: 'text', text }],
});

// Three Follow-ups, one more than the section previews, and room to add another.
export const followUps: ScheduleControls = {
  canCreate: true,
  disabled: false,
  items: [
    followUp('build', 'Check the build', 300_000),
    followUp('reviews', 'Answer new review comments', 600_000),
    followUp('deploy', 'Check the preview deploy', 900_000),
  ],
  create: later,
  setEnd: later,
  manage: noop,
};

export const issueRow = { title: '#412 Fix login on Safari', value: 'Open' };

export const issueFullView = 'Every comment on #412';

const wire = (
  type: string,
  key: string,
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ type, key, props, children, slots: {} });

// The Issue tracker's card page as the Server sends it: one grouped row for the Session's Issue.
const issueTree = wire('List', 'issues', { appearance: 'grouped' }, [
  wire('List.Section', 'attached', {}, [
    wire('FieldGroup.Link', '412', issueRow),
  ]),
]);

// The Issue tracker's card with the tree its page drew, which a phone's Workbench sheet reads as rows.
export const issueCard: SessionPluginCard = {
  pluginId: 'issue-tracker',
  card: {
    id: 'issue',
    title: 'Issue Tracker',
    icon: { sf: 'ticket', material: 'confirmation_number' },
    page: '/issues/session',
    tab: '/issues/session/full',
  },
  page: <Text>{`${issueRow.title} · ${issueRow.value}`}</Text>,
  tab: <Text>{issueFullView}</Text>,
  tree: { subscribe: () => noop, read: () => issueTree },
};

// A Session with every Workbench card: pull requests and changed files, Agents, Background Tasks, Runs, Follow-ups and a Plugin's card.
export const populated: SessionInspectorContent = {
  header: {
    title: 'Fix login',
    status: 'idle',
    startedAt: null,
    pullRequests: severalPullRequests,
    changes: {
      summary: { files: 11, additions: 267, deletions: 61 },
      open: false,
      onOpenChange: noop,
    },
  },
  subagents: { subagents: subagentStates.severalMixed, now: subagentNow },
  shells: { shells: sessionShells, now: shellNow, onStop: noop },
  runs: runActions,
  schedules: followUps,
  pluginCards: [issueCard],
};

export const populatedSheet = {
  content: { ...populated, pluginCards: undefined },
  bar: detachableIssuesBar,
};
