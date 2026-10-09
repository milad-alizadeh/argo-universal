import {
  getSessionInfo,
  query,
  type Options,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  AgentConnectInput,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import { toConfigOptions } from './config-options';
import type { VendorMessage } from './messages';
import { sessionOptions } from './sdk-options';
import { sessionCommands } from './session-commands';
import { initialize, type InitializedSession } from './session-initialization';
import { readMessages } from './session-messages';
import { prepareSession, type QueryContext } from './session-resources';
export async function connect(
  input: AgentConnectInput,
  listener: VendorSessionListener<VendorMessage>,
  signal: AbortSignal,
): Promise<VendorSession> {
  signal.throwIfAborted();
  const context = prepareSession(input, listener, signal);
  const options = sessionOptions({ ...context, input });
  await checkTranscript(input);
  signal.throwIfAborted();
  const live = startQuery(context, options);
  return connectedSession(live, await initialize(live, input));
}
function startQuery(
  context: ReturnType<typeof prepareSession>,
  options: Options,
): QueryContext {
  context.lifetime.listen();
  const vendor = query({ prompt: context.queue.prompts, options });
  context.lifetime.attach(vendor);
  return { ...context, vendor };
}
async function checkTranscript(input: AgentConnectInput): Promise<void> {
  if (
    input.vendorSessionId &&
    !(await getSessionInfo(input.vendorSessionId, { dir: input.cwd }))
  )
    throw new Error(
      `Claude has no transcript for Session ${input.vendorSessionId} in ${input.cwd}.`,
    );
}
function connectedSession(
  context: QueryContext,
  initialized: InitializedSession,
): VendorSession {
  const messages = readMessages(context);
  return {
    ready: sessionReady(context.vendorSessionId, initialized),
    run: sessionCommands({ ...context, ...initialized }),
    stop: (): Promise<void> => stop(context, messages),
  };
}
function sessionReady(
  vendorSessionId: string,
  { models, values }: InitializedSession,
): VendorSession['ready'] {
  return {
    vendorSessionId,
    configOptions: toConfigOptions(models, values),
    capabilities: {
      planApproval: 'continueTurn',
      stopShell: false,
      permissionFeedback: true,
    },
    continuedOutside: false,
  };
}
async function stop(
  context: QueryContext,
  messages: Promise<void>,
): Promise<void> {
  context.lifetime.detach();
  await context.lifetime.stopRequests();
  context.vendor.close();
  await messages;
}
