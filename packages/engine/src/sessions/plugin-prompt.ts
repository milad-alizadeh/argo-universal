import type { NonUserPromptSender, SessionPromptInput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { sendSessionCommand } from './session-command';
import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';
import { startSessionPrompt } from './session-prompt';
import type { HandlerSources } from './session-sources';

type PluginPromptSources = HandlerSources<
  'readSession' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'ready' | 'context'
>;

export type PluginPromptStatus = 'started' | 'queued';

// A Turn runs, or work already waits, or the queue is paused: the Prompt cannot start now.
const hasWork = ({
  activeTurnId,
  pendingSubmission,
  promptQueue,
}: Pick<
  SessionContext,
  'activeTurnId' | 'pendingSubmission' | 'promptQueue'
>): boolean =>
  [
    activeTurnId !== null,
    pendingSubmission !== null,
    promptQueue.items.length > 0,
    promptQueue.pauseReason !== null,
  ].some(Boolean);

/*
 * A Plugin's Prompt (ADR-0055). An idle Session starts a Turn with the Plugin as sender; a busy or paused
 * one takes it at the end of the queue with that sender, behind everything already there. It only appends:
 * it never resumes a paused queue.
 */
export async function promptFromPlugin(
  sources: PluginPromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
  sender: NonUserPromptSender,
): Promise<PluginPromptStatus> {
  const session = await sources.open.ready(input.sessionId, 'session.queue');
  const context = sources.open.context(input.sessionId);

  if (!context || !hasWork(context))
    return startPluginPrompt(sources, input, sender);

  sources.open.admit();
  await appendPluginPrompt(session, input.prompt, sender);

  return 'queued';
}

async function startPluginPrompt(
  sources: PluginPromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
  sender: NonUserPromptSender,
): Promise<PluginPromptStatus> {
  const started = await startSessionPrompt(sources, input, { sender }).accepted;

  if (started.messageId !== null) return 'started';

  throw new TRPCError({
    code: 'CONFLICT',
    message: `A Hook dropped the Prompt: ${started.drop}`,
  });
}

function appendPluginPrompt(
  session: SessionActorRef,
  prompt: SessionPromptInput['prompt'],
  sender: NonUserPromptSender,
): Promise<void> {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, {
    type: 'session.queue',
    command: { action: 'append', prompt },
    sender,
    committed,
  });

  return committed.promise;
}
