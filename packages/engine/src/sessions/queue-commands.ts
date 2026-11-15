import type {
  QueueCommand,
  SessionPromptInput,
  SessionQueueInput,
} from '@repo/contracts';
import { restartSession } from './restart/restart-session';
import { submittedRestart } from './restart/submitted-restart';
import { sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { SessionHandlerSources } from './session-sources';

const queueEvent = 'session.queue';

function commandQueue(
  session: SessionActorRef,
  command: QueueCommand,
  connectionSignal?: AbortSignal,
): Promise<void> {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, {
    type: queueEvent,
    command,
    committed,
    connectionSignal,
  });

  return committed.promise;
}

export async function managePromptQueue(
  sources: SessionHandlerSources,
  input: SessionQueueInput,
  connectionSignal?: AbortSignal,
): Promise<Record<string, never>> {
  const session = await sources.open.ready(input.sessionId, queueEvent);
  sources.open.admit();
  await commandQueue(session, input.command, connectionSignal);

  return {};
}

export async function submitAppPrompt(
  sources: SessionHandlerSources,
  input: SessionPromptInput,
): Promise<Record<string, never>> {
  const restart = submittedRestart(sources, input);

  // An Argo Slash command acts on the Session: it joins no queue and starts no Turn.
  if (restart) return restartSession(sources.open, input, restart);

  return managePromptQueue(sources, {
    sessionId: input.sessionId,
    command: {
      action: 'append',
      prompt: input.prompt,
      followUpSuggestions: input.followUpSuggestions,
    },
  });
}
