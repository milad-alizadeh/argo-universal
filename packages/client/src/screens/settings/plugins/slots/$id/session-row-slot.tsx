import type { SessionInfo } from '@repo/contracts';
import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import { livePreview } from './session-row-preview';
import type { SlotDetail } from './slot-detail';

const startedAt = Date.parse('2026-01-01T09:00:00.000Z');

const workingFor = 60_000;

// The Session the preview draws while the Server has none: one at work, as the Sessions list shows it.
export const previewSession: SessionInfo = {
  sessionId: 'preview',
  projectId: 'preview',
  agent: 'preview',
  parentSessionId: null,
  startedBySessionId: null,
  cwd: '',
  status: 'running',
  title: 'Fix login redirect',
  titleSource: 'agent',
  activity: '',
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

export const sessionRowSlot: SlotDetail = {
  slotId: sessionRowSlotId,
  title: 'Session rows',
  showTitle: 'Show on Session rows',
  previewCaption: 'how a Session row looks with these settings',
  Preview: livePreview(previewSession),
};
