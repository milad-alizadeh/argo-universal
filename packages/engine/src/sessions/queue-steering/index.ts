import { steerAcpSession, type AcpSessionLease } from '../../agents';
import { promptStorage } from '../acp-operations';
import { readAcpPromptContent } from '../acp/prompts/prompt-content';
import { sendSessionCommand } from '../session-command';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import type { QueueSteering, SteerCommand } from './types';

export { finishQueueSteering, reserveQueueSteering } from './state';

export async function steerQueuedPrompt(
  session: SessionActorRef,
  command: SteerCommand,
): Promise<void> {
  const steering = await reserve(session, command);
  let injected = false;

  try {
    await inject(session, steering);
    injected = true;
  } finally {
    await finish(session, steering.token, injected);
  }
}

function reserve(
  session: SessionActorRef,
  command: SteerCommand,
): Promise<QueueSteering> {
  const reserved = Promise.withResolvers<QueueSteering>();
  sendSessionCommand(session, {
    type: 'session.reserveQueueSteering',
    command,
    reserved,
  });

  return reserved.promise;
}

async function inject(
  session: SessionActorRef,
  steering: QueueSteering,
): Promise<void> {
  const context = session.getSnapshot().context;
  const lease = requireLease(context);
  const prompt = await readSteeringPrompt(context, steering);

  await steerAcpSession(lease, prompt);
}

function requireLease(context: SessionContext): AcpSessionLease {
  if (!context.acpLease) throw new Error('The Agent connection ended');

  return context.acpLease;
}

function readSteeringPrompt(
  context: SessionContext,
  steering: QueueSteering,
): ReturnType<typeof readAcpPromptContent> {
  return readAcpPromptContent({
    content: steering.prompt,
    capabilities:
      requireLease(context).initialization.agentCapabilities
        ?.promptCapabilities ?? {},
    storage: promptStorage(context.input),
  });
}

function finish(
  session: SessionActorRef,
  token: string,
  injected: boolean,
): Promise<void> {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, {
    type: 'session.finishQueueSteering',
    token,
    injected,
    committed,
  });

  return committed.promise;
}
