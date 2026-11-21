import { steerAcpSession, type AcpSessionLease } from '../../agents';
import { promptStorage } from '../acp-operations';
import { readAcpPromptContent } from '../acp/prompts/prompt-content';
import { withConversationContext } from '../conversation-prompt-context';
import { requireNativeCommandAuthority } from '../prompt-authorization';
import { sendSessionCommand } from '../session-command';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import type { QueueSteering, SteerCommand } from './types';

export {
  finishQueueSteering,
  reserveQueueSteering,
  steeredMessageId,
} from './state';

// Takes a Prompt into the running Turn and answers with that Turn's id.
export async function steerQueuedPrompt(
  session: SessionActorRef,
  command: SteerCommand,
): Promise<string> {
  const steering = await reserve(session, command);
  let injected = false;

  try {
    await inject(session, steering);
    injected = true;
  } finally {
    await finish(session, steering.token, injected);
  }

  return steering.turnId;
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
  requireNativeCommandAuthority(steering.prompt, steering.sender);
  const blocks = await readSteeringPrompt(context, steering);
  const { database, writer } = context.input;

  const prompt = withConversationContext(
    {
      database,
      findWriter: () => writer,
      findFeed: () => session.getSnapshot().children.feed,
    },
    { sessionId: context.sessionId, sender: steering.sender, prompt: blocks },
  );

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
