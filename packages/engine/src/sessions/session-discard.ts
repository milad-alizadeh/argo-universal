import { discardCheckout, isSessionBranch } from '@repo/git';
import { readProjectPath } from '../projects';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../storage';
import type {
  NewSessionInput,
  SessionData,
  SessionInput,
} from './session-data';
import { SessionDeleteJob } from './session-storage/session-storage';

export interface SessionDiscard {
  input: SessionInput;
  data: Pick<SessionData, 'sessionId' | 'projectId' | 'checkout'>;
  stored: boolean;
  writer: WriterActorRef | undefined;
}

const createdWorktreeProject = (input: NewSessionInput): string | undefined =>
  input.checkout.type === 'worktree' ? input.projectPath : undefined;

// The Project path of a worktree the Session created; undefined for the main checkout.
const ownedWorktreeProject = ({
  input,
  data,
}: SessionDiscard): string | undefined => {
  if (input.kind === 'new') return createdWorktreeProject(input);

  return isSessionBranch(data.checkout.branch, data.sessionId)
    ? readProjectPath(input.database, data.projectId)
    : undefined;
};

async function discardStored(discard: SessionDiscard): Promise<void> {
  if (!discard.writer) throw new Error('Database Writer is unavailable');

  await writeDatabaseJobAndWaitForCommit(
    discard.writer,
    new SessionDeleteJob(discard.data.sessionId),
  );
}

// Deletes the row of a Session no prompt reached, then removes the worktree it created; the main checkout stays.
export async function discardSession(
  discard: SessionDiscard,
  signal?: AbortSignal,
): Promise<void> {
  if (discard.stored) await discardStored(discard);

  const projectPath = ownedWorktreeProject(discard);

  if (projectPath)
    await discardCheckout(projectPath, discard.data.checkout, signal);
}
