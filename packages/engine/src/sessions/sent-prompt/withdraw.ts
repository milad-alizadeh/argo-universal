import type { SendSources } from './landing';
import { queueEvent, sendQueueCommand } from './queue';

// The Queued Prompt a Plugin takes back, by the id its send answered with.
export type Withdrawal = {
  sessionId: string;
  queuedId: string;
  pluginId: string;
};

/*
 * A Plugin takes back a Queued Prompt it sent (ADR-0055). One that started, is gone, or the person is editing stays as
 * it is and answers false; anyone else's is refused. The queue step that changes the queue gives the answer.
 */
export async function withdrawPrompt(
  sources: Pick<SendSources, 'open'>,
  { sessionId, queuedId, pluginId }: Withdrawal,
): Promise<boolean> {
  const session = await sources.open.ready(sessionId, queueEvent);

  sources.open.admit();

  const decided = Promise.withResolvers<boolean>();
  const command = { action: 'withdraw' as const, id: queuedId };

  await sendQueueCommand(session, {
    command: { ...command, pluginId, decided: decided.resolve },
  });

  return decided.promise;
}
