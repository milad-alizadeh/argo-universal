import {
  QueuedPromptId,
  type NonUserPromptSender,
  type SessionPromptInput,
} from '@repo/contracts';
import type { PluginPromptAnswer } from '@repo/contracts/plugins/argo-calls';
import { promptFromPlugin } from './plugin-prompt';
import { steerQueuedPrompt } from './queue-steering';
import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';
import type { HandlerSources } from './session-sources';

type VoicePromptSources = Parameters<typeof promptFromPlugin>[0] &
  HandlerSources<never, 'ready'>;

// The Voice call as a Prompt sender (ADR-0062): stored with the Prompt and never drawn.
const voiceSender: NonUserPromptSender = { type: 'voice' };

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

// A queued Prompt takes its place in a running Turn; any refusal leaves it queued.
async function steerWhenPossible(
  session: SessionActorRef,
  queuedId: string,
): Promise<void> {
  const item = steerable(session, queuedId);

  if (item)
    await steerQueuedPrompt(session, {
      action: 'steer',
      id: QueuedPromptId.parse(item.id),
      revision: item.revision,
    }).catch(() => {});
}

/*
 * A request for work from the Voice call. It goes where a Plugin's Prompt goes: an idle Session starts a Turn with the
 * Voice call as sender, a busy one queues it. A busy Session whose Agent supports steering takes it into the running
 * Turn at once, as a typed Prompt sent with steering does; otherwise it waits in the queue.
 */
export async function promptFromVoice(
  sources: VoicePromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
): Promise<PluginPromptAnswer> {
  const answer = await promptFromPlugin(sources, input, voiceSender);

  if (answer.status === 'queued')
    await steerWhenPossible(
      await sources.open.ready(input.sessionId, 'session.queue'),
      answer.queuedId,
    );

  return answer;
}
