import type {
  SessionMarkSeenInput,
  SessionMarkSeenOutput,
} from '@repo/contracts';
import { findMachineActor } from '../lib/machine-actor';
import {
  databaseWriterId,
  writeDatabaseJobAndWaitForCommit,
  writerMachine,
} from '../storage';
import type { SessionRouterDeps } from './router-deps';
import { SessionSeenJob } from './session-storage';

// Stores that an App showed the end of a Session's Feed, which clears Unread on every App.
export async function markSessionSeen(
  deps: Pick<SessionRouterDeps, 'sessions'>,
  seen: SessionMarkSeenInput,
): Promise<SessionMarkSeenOutput> {
  const writer = findMachineActor(
    deps.sessions.system,
    databaseWriterId,
    writerMachine,
  );
  if (!writer) throw new Error('Database Writer is unavailable');
  await writeDatabaseJobAndWaitForCommit(writer, new SessionSeenJob(seen));
  return {};
}
