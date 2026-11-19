import type { NonUserPromptSender, SessionPromptInput } from '@repo/contracts';
import { requireSent, sendPromptAs, type SentPrompt } from './plugin-prompt';
import { PromptWatch } from './prompt-turn';
import type { HandlerSources } from './session-sources';
import { steered, type SteeredPrompt } from './steered-prompt';

type VoicePromptSources = Parameters<typeof sendPromptAs>[0] &
  HandlerSources<never, 'ready'>;

// The Voice call as a Prompt sender (ADR-0064): stored with the Prompt and never drawn.
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

// The answer, followed into the Turn that holds the Prompt.
function followed(
  watch: PromptWatch,
  answer: SteeredPrompt,
): VoicePromptAnswer {
  if (answer.status !== 'queued')
    return { ...answer, ended: watch.ended({ turnId: answer.turnId }) };

  const { queuedId, notSteered } = answer;

  return { status: 'queued', notSteered, ended: watch.ended({ queuedId }) };
}

// Sends the Prompt while the Session's Turn happenings are already heard, so a Turn that ends at once is not missed.
async function sendWatched(
  sources: VoicePromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
  watch: PromptWatch,
): Promise<SentPrompt> {
  try {
    const request = { sender: voiceSender, id: sources.createId() };

    return requireSent(await sendPromptAs(sources, input, request));
  } catch (error) {
    watch.stop();
    throw error;
  }
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
  const session = await sources.open.ready(input.sessionId, 'session.queue');
  const watch = new PromptWatch(session);
  const sent = await sendWatched(sources, input, watch);

  return followed(watch, await steered(session, sent));
}
