import { SessionRecord, type Turn } from '@repo/contracts';
import type { SessionInfoFixture } from './session-info-case';

export const stored = SessionRecord.parse({
  id: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  title: 'Check reliability',
  titleSource: 'user',
  archivedAt: null,
  seenRevision: 0,
  activityAt: 100,
  failure: null,
  vendorSessionId: null,
  parentSessionId: null,
  checkoutPath: '/project',
  checkoutBranch: 'main',
  vendorRef: null,
  configValues: [],
  heldConfig: [],
  epoch: 0,
  projectionVersion: 1,
  maxRevision: 0,
  createdAt: 10,
  updatedAt: 20,
});

export const idle: SessionInfoFixture = {
  row: stored,
  turns: [],
  message: undefined,
  plan: undefined,
  live: null,
  feed: null,
  liveHeader: null,
  activeTurnId: null,
  children: [],
};

export const live = {
  activeTurnId: 'turn-1',
  activeTurnStartedAt: 50,
  permissionQueue: [],
  elicitationQueue: [],
  planProposal: null,
  failure: null,
};

export const turn: Turn = {
  id: 'turn-1',
  sessionId: 'session-1',
  status: 'running',
  startedAt: 50,
  endedAt: null,
  stopReason: null,
  error: null,
  usage: null,
  model: null,
};

export const information = {
  sessionId: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  parentSessionId: null,
  cwd: '/project',
  createdAt: 10,
  updatedAt: 20,
  title: 'Check reliability',
  titleSource: 'user',
  status: 'idle',
  activity: '',
  activityAt: 100,
  checkout: { type: 'main', path: '/project', branch: 'main' },
  plan: null,
  subagents: { total: 0, running: 0 },
  shells: { total: 0, running: 0 },
  archivedAt: null,
  pullRequest: null,
};
