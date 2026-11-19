import type { NonUserPromptSender, SessionPromptInput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { PromptWatch, type PromptPlace } from '../prompt-turn';
import type { PromptLanding } from '../session-prompt';
import { landPrompt, type SendSources } from './landing';
import { queueEvent } from './queue';

export { withdrawPrompt } from './withdraw';

/*
 * Who sends the Prompt; the id it takes, as its Turn's id or, queued, as its queued id, which a new one is made for
 * when the caller has none; and the caller's budget, which also stops its admission.
 */
export type SendRequest = {
  sender: NonUserPromptSender;
  id?: string;
  signal?: AbortSignal;
};

/*
 * Where a Sent Prompt landed, followed into the Turn that holds it. `ended` settles with that Turn's id when it
 * ends, or with null when the Prompt left the queue, or was dropped, without a Turn; it never rejects.
 */
export type SentPrompt = PromptLanding & { ended: Promise<string | null> };

// A Sent Prompt that no Hook dropped.
export type TakenPrompt = Exclude<SentPrompt, { status: 'dropped' }>;

const placeOf = (landing: PromptLanding): PromptPlace | null => {
  if (landing.status === 'dropped') return null;

  return landing.status === 'queued'
    ? { queuedId: landing.queuedId }
    : { turnId: landing.turnId };
};

function followed(
  watch: PromptWatch,
  landing: PromptLanding,
): Promise<string | null> {
  const place = placeOf(landing);

  if (place) return watch.ended(place);
  watch.stop();

  return Promise.resolve(null);
}

// Lands the Prompt; a refusal stops hearing the Session, since no Prompt is left to follow.
async function landWatched(
  watch: PromptWatch,
  ...landing: Parameters<typeof landPrompt>
): Promise<PromptLanding> {
  try {
    return await landPrompt(...landing);
  } catch (error) {
    watch.stop();
    throw error;
  }
}

/*
 * Sends a Prompt from a sender other than the person (ADR-0054, ADR-0055, ADR-0064). An idle Session starts a Turn
 * with it. A busy or paused one takes it at the end of the queue with its sender, behind everything already there,
 * and never resumes a paused queue; a running Turn whose Agent supports steering takes it in at once, unless a Plugin
 * sent it. The Session's Turn happenings are heard from before it is sent, so a Turn that ends at once is not missed.
 */
export async function sendPrompt(
  sources: SendSources,
  input: SessionPromptInput,
  { id = sources.createId(), ...request }: SendRequest,
): Promise<SentPrompt> {
  const { signal } = request;
  const session = await sources.open.ready(input.sessionId, queueEvent, signal);
  const watch = new PromptWatch(session);
  const sending = { ...request, input, id };
  const landing = await landWatched(watch, sources, session, sending);

  return { ...landing, ended: followed(watch, landing) };
}

// A Plugin's and the Voice call's Prompt that a Hook dropped is refused, saying why; another Session's says it was dropped.
export function requireTaken(sent: SentPrompt): TakenPrompt {
  if (sent.status !== 'dropped') return sent;

  throw new TRPCError({
    code: 'CONFLICT',
    message: `A Hook dropped the Prompt: ${sent.drop}`,
  });
}
