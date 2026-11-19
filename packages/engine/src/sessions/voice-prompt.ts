import {
  QueuedPromptId,
  type NonUserPromptSender,
  type SessionPromptInput,
} from '@repo/contracts';
import { sendPromptAs } from './plugin-prompt';
import { promptTurnEnded } from './prompt-turn';
import { steerQueuedPrompt } from './queue-steering';
import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';
import type { HandlerSources } from './session-sources';

type VoicePromptSources = Parameters<typeof sendPromptAs>[0] &
  HandlerSources<never, 'ready'>;

// The Voice call as a Prompt sender (ADR-0063): stored with the Prompt and never drawn.
const voiceSender: NonUserPromptSender = { type: 'voice' };

/*
 * What became of a Prompt from the Voice call. `ended` settles with the Turn's id when the Turn that holds the Prompt
 * ends, or with null when it left the queue without a Turn; it never rejects. A queued Prompt that could not steer
 * the running Turn says why in `notSteered`.
 */
export type VoicePromptAnswer = { ended: Promise<string | null> } & (
  | { status: 'started' | 'steered'; turnId: string }
  | { status: 'queued'; notSteered: string | null }
);

type Steerable = { id: string; revision: number };

// The queued Prompt a running Turn could take in now, when its Agent can be steered.
function steerable(
  session: SessionActorRef,
  queuedId: string,
): Steerable | undefined {
  const { context } = session.getSnapshot();

  return canSteer(context)
    ? context.promptQueue.items.find(({ id }) => id === queuedId)
    : undefined;
}

const canSteer = ({
  acpLease,
  activeTurnId,
}: Pick<SessionContext, 'acpLease' | 'activeTurnId'>): boolean =>
  acpLease?.steering === true && activeTurnId !== null;

const inTurn = (
  session: SessionActorRef,
  status: 'started' | 'steered',
  turnId: string,
): VoicePromptAnswer => ({
  status,
  turnId,
  ended: promptTurnEnded(session, { turnId }),
});

const waiting = (
  session: SessionActorRef,
  queuedId: string,
  notSteered: string | null,
): VoicePromptAnswer => ({
  status: 'queued',
  notSteered,
  ended: promptTurnEnded(session, { queuedId }),
});

// A queued Prompt takes its place in a running Turn; a refusal leaves it queued, and says why.
function steerOrWait(
  session: SessionActorRef,
  queuedId: string,
): Promise<VoicePromptAnswer> | VoicePromptAnswer {
  const item = steerable(session, queuedId);

  if (!item) return waiting(session, queuedId, null);

  const { revision } = item;
  const id = QueuedPromptId.parse(item.id);

  return steerQueuedPrompt(session, { action: 'steer', id, revision }).then(
    (turnId) => inTurn(session, 'steered', turnId),
    (error: Error) => waiting(session, queuedId, error.message),
  );
}

/*
 * A request for work from the Voice call. It goes where a Plugin's Prompt goes: an idle Session starts a Turn with the
 * Voice call as sender, a busy one queues it. A busy Session whose Agent supports steering takes it into the running
 * Turn at once, as a typed Prompt sent with steering does; otherwise it waits in the queue.
 */
export async function promptFromVoice(
  sources: VoicePromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
): Promise<VoicePromptAnswer> {
  const sent = await sendPromptAs(sources, input, voiceSender);
  const session = await sources.open.ready(input.sessionId, 'session.queue');

  return sent.status === 'started'
    ? inTurn(session, 'started', sent.turnId)
    : steerOrWait(session, sent.queuedId);
}
