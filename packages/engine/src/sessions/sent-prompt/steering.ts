import { QueuedPromptId, type NonUserPromptSender } from '@repo/contracts';
import { promptMessageId } from '../../feed';
import { steeredMessageId, steerQueuedPrompt } from '../queue-steering';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import type { PromptLanding } from '../session-prompt';

// A queued Prompt: who sent it, and its queued id.
export type QueuedSend = { sender: NonUserPromptSender; id: string };

type Steerable = { id: string; revision: number };

// A Plugin's Prompt waits its turn (ADR-0055); the Voice call's and another Session's steer (ADR-0064, ADR-0054).
const steers = ({ type }: NonUserPromptSender): boolean => type !== 'plugin';

const canSteer = ({
  acpLease,
  activeTurnId,
}: Pick<SessionContext, 'acpLease' | 'activeTurnId'>): boolean =>
  acpLease?.steering === true && activeTurnId !== null;

// The queued Prompt a running Turn could take in now, when its sender steers and its Agent can be steered.
function steerable(
  session: SessionActorRef,
  { sender, id }: QueuedSend,
): Steerable | undefined {
  const { context } = session.getSnapshot();

  return steers(sender) && canSteer(context)
    ? context.promptQueue.items.find((item) => item.id === id)
    : undefined;
}

const waiting = (
  { sender, id }: QueuedSend,
  notSteered: string | null,
): PromptLanding => ({
  status: 'queued',
  messageId: promptMessageId(id, sender),
  queuedId: id,
  notSteered,
});

/*
 * A queued Prompt takes its place in the running Turn, as a typed Prompt sent with steering does; a refusal leaves it
 * queued, and says why. One that cannot steer waits its turn.
 */
export function steerOrWait(
  session: SessionActorRef,
  queued: QueuedSend,
): Promise<PromptLanding> | PromptLanding {
  const item = steerable(session, queued);

  if (!item) return waiting(queued, null);

  const { revision } = item;
  const id = QueuedPromptId.parse(item.id);

  return steerQueuedPrompt(session, { action: 'steer', id, revision }).then(
    (turnId) => steered(turnId, queued),
    (error: Error) => waiting(queued, error.message),
  );
}

const steered = (turnId: string, { id }: QueuedSend): PromptLanding => ({
  status: 'steered',
  turnId,
  messageId: steeredMessageId(turnId, id),
});
