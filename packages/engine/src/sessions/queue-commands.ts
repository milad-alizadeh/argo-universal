import type {
  QueueCommand,
  SessionSubmitInput,
  SessionQueueInput,
} from '@repo/contracts';
import { steerQueuedPrompt } from './queue-steering';
import { restartSession } from './restart/restart-session';
import { submittedRestart } from './restart/submitted-restart';
import { sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { SessionHandlerSources } from './session-sources';

const queueEvent = 'session.queue';

function commandQueue(
  session: SessionActorRef,
  command: Exclude<QueueCommand, { action: 'steer' }>,
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

  await (input.command.action === 'steer'
    ? steerQueuedPrompt(session, input.command)
    : commandQueue(session, input.command, connectionSignal));

  return {};
}

export async function submitAppPrompt(
  sources: SessionHandlerSources,
  input: SessionSubmitInput,
): Promise<Record<string, never>> {
  if (await steerDraft(sources, input)) return {};
  const restart = submittedRestart(sources, input);

  // An Argo Slash command acts on the Session: it joins no queue and starts no Turn.
  if (restart) return restartSession(sources.open, input, restart);

  return managePromptQueue(sources, queuedSubmission(input));
}

async function steerDraft(
  sources: SessionHandlerSources,
  input: SessionSubmitInput,
): Promise<boolean> {
  if (!input.steer) return false;
  const session = await sources.open.ready(input.sessionId, queueEvent);
  sources.open.admit();

  if (session.getSnapshot().context.activeTurnId === null) return false;
  await steerQueuedPrompt(session, {
    action: 'steerDraft',
    prompt: input.prompt,
  });

  return true;
}

function queuedSubmission(input: SessionSubmitInput): SessionQueueInput {
  return {
    sessionId: input.sessionId,
    command: {
      action: 'append',
      prompt: input.prompt,
      followUpSuggestions: input.followUpSuggestions,
    },
  };
}
