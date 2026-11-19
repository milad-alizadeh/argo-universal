import type { QueueSessionCommand } from '../queue-command-types';
import { sendSessionCommand } from '../session-command';
import type { SessionActorRef } from '../session-machine';

export const queueEvent = 'session.queue';

type ServerQueueEvent = Omit<
  Extract<QueueSessionCommand, { type: typeof queueEvent }>,
  'type' | 'committed' | 'connectionSignal'
>;

// Changes the Session's queue as the Server, not an App, and settles once the change is stored.
export function sendQueueCommand(
  session: SessionActorRef,
  event: ServerQueueEvent,
): Promise<void> {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, { type: queueEvent, ...event, committed });

  return committed.promise;
}
