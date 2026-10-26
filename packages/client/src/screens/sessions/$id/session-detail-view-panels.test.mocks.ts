import type { ChangesSummary } from '@repo/contracts';
import { fn } from 'storybook/test';
import { changesArgs } from '../../../features/frame/components/changes-inspector/changes-inspector.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { subagentsSession } from './session-detail-view-subagents.mocks';

const summary: ChangesSummary = {
  files: changesArgs.summary.files,
  additions: changesArgs.summary.added,
  deletions: changesArgs.summary.removed,
};

// Recorded branch edits make Changes a real section beside the Session's Agents.
export const panelsSession = {
  ...subagentsSession,
  header: {
    ...subagentsSession.header,
    changes: { summary, open: false, onOpenChange: fn() },
  },
  changes: changesArgs,
} satisfies SessionDetailViewProps;
