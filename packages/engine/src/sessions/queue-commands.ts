import type {
  QueueCommand,
  SessionPromptInput,
  SessionQueueInput,
} from '@repo/contracts';
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
  return managePromptQueue(sources, {
    sessionId: input.sessionId,
    command: { action: 'append', prompt: input.prompt },
  });
}
