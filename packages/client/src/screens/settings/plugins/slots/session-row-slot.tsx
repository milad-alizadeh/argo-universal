import type { SessionInfo } from '@repo/contracts';
import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { SessionRow } from '#features/sessions';
import type { SlotPreviewProps, SlotSettings } from './slot-settings';

export const argoActivity = 'Editing login.ts';

const startedAt = Date.parse('2026-01-01T09:00:00.000Z');

const workingFor = 60_000;

// The Session the preview draws: one at work, as the Sessions list shows it.
const previewSession: SessionInfo = {
  sessionId: 'preview',
  projectId: 'preview',
  agent: 'preview',
  parentSessionId: null,
  cwd: '',
  status: 'running',
  title: 'Fix login redirect',
  titleSource: 'agent',
  activity: argoActivity,
  activityAt: startedAt + workingFor,
  checkout: { type: 'worktree', path: '', branch: 'fix-login-redirect' },
  plan: null,
  subagents: { running: 0, total: 0 },
  shells: { running: 0, total: 0 },
  archivedAt: null,
  pullRequest: null,
  createdAt: startedAt,
  updatedAt: startedAt + workingFor,
};

const previewPullRequest = { number: 1301, stage: 'open' } as const;

// The Sessions list's own row: the Plugins' samples are its items, and the part's owner writes its Activity line.
function SessionRowPreview({
  samples,
  part,
}: SlotPreviewProps): React.JSX.Element {
  return (
    <SessionRow
      session={{ ...previewSession, activity: part ?? argoActivity }}
      logo=""
      age="2m"
      pullRequest={previewPullRequest}
      items={samples}
      onSelect={ignore}
    />
  );
}

const ignore = (): void => undefined;

export const sessionRowSlot: SlotSettings = {
  slotId: sessionRowSlotId,
  path: 'session-rows',
  title: 'Session rows',
  showTitle: 'Show on Session rows',
  previewCaption: 'how a Session row looks with these settings',
  Preview: SessionRowPreview,
  part: { title: 'Activity line', argoSubtitle: 'Status and time, as today.' },
};
