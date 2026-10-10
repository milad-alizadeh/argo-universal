import type { LocalSubmission } from './conversation/submission';
import { sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';

export const submitSessionPrompt = (
  session: SessionActorRef,
  submission: LocalSubmission,
): Promise<void> => {
  if (!session.getSnapshot().context.acpLease) {
    sendSessionCommand(session, { type: 'session.prompt', ...submission });
    return Promise.resolve();
  }
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, {
    type: 'session.prompt',
    ...submission,
    committed,
  });
  return committed.promise;
};
