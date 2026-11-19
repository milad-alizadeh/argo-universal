import type { SentPromptSender, SessionPromptInput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { PromptSend } from '../prompt-sender';
import {
  PromptWatch,
  type FollowedPrompt,
  type PromptPlace,
} from '../prompt-turn';
import type { PromptLanding } from '../session-prompt';
import { landPrompt, type SendSources } from './landing';
import { queueEvent } from './queue';

export { withdrawPrompt } from './withdraw';

// A Sent Prompt's send; a new id is made for it when the caller has none.
export type SendRequest = Omit<PromptSend<SentPromptSender>, 'id'> & {
  id?: string;
};

/*
 * Where a Sent Prompt landed, followed into the Turn that holds it. `started` settles once a Turn holds it, true, or
 * false when it left the queue, or was dropped, without one. `ended` settles with that Turn's id when it ends, or
 * with null when no Turn held it. Neither rejects.
 */
export type SentPrompt = PromptLanding & FollowedPrompt;

// A Sent Prompt that no Hook dropped.
export type TakenPrompt = Exclude<SentPrompt, { status: 'dropped' }>;

const placeOf = (landing: PromptLanding): PromptPlace | null => {
  if (landing.status === 'dropped') return null;

  return landing.status === 'queued'
    ? { queuedId: landing.queuedId }
    : { turnId: landing.turnId };
};

const neverHeld: FollowedPrompt = {
  started: Promise.resolve(false),
  ended: Promise.resolve(null),
};

function followed(watch: PromptWatch, landing: PromptLanding): FollowedPrompt {
  const place = placeOf(landing);

  if (place) return watch.follow(place);
  watch.stop();

  return neverHeld;
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

  return { ...landing, ...followed(watch, landing) };
}

// A Plugin's and the Voice call's Prompt that a Hook dropped is refused, saying why; another Session's says it was dropped.
export function requireTaken(sent: SentPrompt): TakenPrompt {
  if (sent.status !== 'dropped') return sent;

  throw new TRPCError({
    code: 'CONFLICT',
    message: `A Hook dropped the Prompt: ${sent.drop}`,
  });
}
