import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { feedMachine } from '../../../feed';
import type { sessionMachine } from '../../session-machine';

export type SessionState = SnapshotFrom<typeof sessionMachine>;

export type SnapshotFeed = {
  context: Pick<
    SnapshotFrom<typeof feedMachine>['context'],
    'epoch' | 'maxRevision'
  > & { rows?: Record<string, SessionUpdate> };
};

export type StoredSnapshot = Pick<
  SessionSnapshot,
  'projectId' | 'agent' | 'title' | 'titleSource' | 'checkout'
> &
  Partial<Pick<SessionSnapshot, 'subagents' | 'shells'>>;

export type SessionDisplayContext = Pick<
  SessionState['context'],
  | 'activeTurnId'
  | 'activeTurnStartedAt'
  | 'usage'
  | 'permissionQueue'
  | 'elicitationQueue'
  | 'configOptions'
  | 'heldConfig'
>;
