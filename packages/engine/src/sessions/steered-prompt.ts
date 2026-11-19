import {
  QueuedPromptId,
  type NonUserPromptSender,
  type SessionPromptInput,
} from '@repo/contracts';
import { promptMessageId } from '../feed';
import { sendPromptAs, type SentPrompt } from './plugin-prompt';
import type { NativeStart, NativeStartRequest } from './prompt-sender';
import { steeredMessageId, steerQueuedPrompt } from './queue-steering';
import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';
import type { AcceptedSessionPrompt } from './session-prompt';
import type { HandlerSources } from './session-sources';

/*
 * Where a Prompt from a sender other than the person landed, once steering had its chance: the Turn it started or
 * was steered into, or its place in the queue. A queued Prompt that could not steer the running Turn says why.
 */
export type SteeredPrompt =
  | { status: 'started' | 'steered'; turnId: string }
  | { status: 'queued'; queuedId: string; notSteered: string | null };

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

const waiting = (
  queuedId: string,
  notSteered: string | null,
): SteeredPrompt => ({ status: 'queued', queuedId, notSteered });

// A queued Prompt takes its place in a running Turn; a refusal leaves it queued, and says why.
function steerOrWait(
  session: SessionActorRef,
  queuedId: string,
): Promise<SteeredPrompt> | SteeredPrompt {
  const item = steerable(session, queuedId);

  if (!item) return waiting(queuedId, null);

  const { revision } = item;
  const id = QueuedPromptId.parse(item.id);

  return steerQueuedPrompt(session, { action: 'steer', id, revision }).then(
    (turnId): SteeredPrompt => ({ status: 'steered', turnId }),
    (error: Error) => waiting(queuedId, error.message),
  );
}

/*
 * A Prompt that started keeps its Turn; one that queued behind a running Turn is steered into it when the Session's
 * Agent supports steering, as a typed Prompt sent with steering is, and otherwise waits its turn (ADR-0054).
 */
export function steered(
  session: SessionActorRef,
  sent: SentPrompt,
): Promise<SteeredPrompt> | SteeredPrompt {
  return sent.status === 'started' ? sent : steerOrWait(session, sent.queuedId);
}

type SteeredSources = Parameters<typeof sendPromptAs>[0] &
  HandlerSources<never, 'ready'>;

type SteeredRequest = Pick<NativeStartRequest, 'signal'> & {
  sender: NonUserPromptSender;
  turnId: string;
};

// Where a sent Prompt landed, as an admitted Prompt says it; a queued one's Turn will take its queued id.
function accepted(
  answer: SteeredPrompt,
  { sender, turnId }: Pick<SteeredRequest, 'sender' | 'turnId'>,
): AcceptedSessionPrompt {
  const messageId = promptMessageId(turnId, sender);

  if (answer.status === 'queued') {
    const { notSteered } = answer;

    return { status: 'queued', messageId, turnId, notSteered };
  }

  return answer.status === 'started'
    ? { ...answer, messageId }
    : { ...answer, messageId: steeredMessageId(answer.turnId, turnId) };
}

async function sendSteered(
  sources: SteeredSources,
  input: SessionPromptInput,
  { sender, signal, turnId }: SteeredRequest,
): Promise<AcceptedSessionPrompt> {
  const { sessionId } = input;
  const session = await sources.open.ready(sessionId, 'session.queue', signal);
  const request = { sender, id: turnId, signal };
  const sent = await sendPromptAs(sources, input, request);

  if (sent.status === 'dropped') return { messageId: null, drop: sent.drop };

  return accepted(await steered(session, sent), { sender, turnId });
}

/*
 * Another Session's Prompt (ADR-0044) goes where a Plugin's and the Voice call's do (ADR-0055, ADR-0064): an idle
 * Session starts a Turn, a busy one takes it into the running Turn when its Agent can be steered, and otherwise
 * queues it. Its id is allocated first, as its Turn's or queued id, so its caller can follow the Turn it lands in.
 */
export function startSteeredPrompt(
  sources: SteeredSources,
  input: SessionPromptInput,
  request: Omit<SteeredRequest, 'turnId'>,
): NativeStart<AcceptedSessionPrompt> {
  const turnId = sources.createId();

  return {
    sessionId: input.sessionId,
    turnId,
    accepted: sendSteered(sources, input, { ...request, turnId }),
  };
}
