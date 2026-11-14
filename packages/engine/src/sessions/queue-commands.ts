import type {
  QueueCommand,
  SessionPromptInput,
  SessionQueueInput,
} from '@repo/contracts';
import { userOrigin } from './prompt-sender';
import { sendSessionCommand } from './session-command';
import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';
import { startSessionPrompt } from './session-prompt';
import type { SessionHandlerSources } from './session-sources';

const queueEvent = 'session.queue';

function commandQueue(
  session: SessionActorRef,
  command: QueueCommand,
): Promise<void> {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, { type: queueEvent, command, committed });

  return committed.promise;
}

export async function managePromptQueue(
  sources: SessionHandlerSources,
  input: SessionQueueInput,
): Promise<Record<string, never>> {
  const session = await sources.open.ready(input.sessionId, queueEvent);
  sources.open.admit();
  await commandQueue(session, input.command);

  return {};
}

export async function submitAppPrompt(
  sources: SessionHandlerSources,
  input: SessionPromptInput,
): Promise<Record<string, never>> {
  const session = await sources.open.ready(input.sessionId, queueEvent);
  sources.open.admit();
  await (shouldQueue(session)
    ? commandQueue(session, { action: 'append', prompt: input.prompt })
    : startSessionPrompt(sources, input, userOrigin).accepted);

  return {};
}

function shouldQueue(session: SessionActorRef): boolean {
  const snapshot = session.getSnapshot();

  return snapshot.hasTag('running') || hasQueuedWork(snapshot.context);
}

function hasQueuedWork(context: SessionContext): boolean {
  return (
    context.promptQueue.items.length > 0 ||
    context.promptQueue.pauseReason !== null
  );
}
