import type {
  AgentConnectInput,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import {
  type Model,
  type ConfigValues,
  startingValues,
  toConfigOptions,
} from './config-options';
import { initialize, readModels, usesChatGpt } from './handshake';
import type { VendorMessage } from './messages';
import { openAppServer } from './open-app-server';
import type { ThreadStartParams } from './protocol.gen';
import { commandRunner } from './session-commands';
import { receiveMessage } from './session-notifications';
import {
  type VendorSessionState,
  sessionState,
  cancelRequests,
  closeSession,
} from './vendor-session-state';
interface StartupInput {
  connect: AgentConnectInput;
  listener: VendorSessionListener<VendorMessage>;
  signal: AbortSignal;
}
const openSession = (input: StartupInput): VendorSessionState => {
  const cancel = (): void => cancelRequests(state);
  const server = openAppServer(
    serverInput(input, (): VendorSessionState => state),
  );
  const state = sessionState({ ...input, server, cancelRequests: cancel });
  input.signal.addEventListener('abort', cancel, { once: true });
  return state;
};
const serverInput = (
  input: StartupInput,
  state: () => VendorSessionState,
): Parameters<typeof openAppServer>[0] => ({
  cwd: input.connect.cwd,
  onMessage: (message): void => receiveMessage(state(), message),
  onFailure: (error): void => input.listener.failed(error),
  signal: input.signal,
});
const threadSettings = (
  input: AgentConnectInput,
  values: ConfigValues,
): ThreadStartParams => ({
  cwd: input.cwd,
  model: values.model,
  approvalPolicy: 'on-request',
  sandbox: 'workspace-write',
});
const startThread = async (
  state: VendorSessionState,
  input: AgentConnectInput,
  values: ConfigValues,
): Promise<void> => {
  const settings = threadSettings(input, values);
  const started = input.vendorSessionId
    ? await state.server.request('thread/resume', {
        ...settings,
        threadId: input.vendorSessionId,
      })
    : await state.server.request('thread/start', settings);
  state.vendorSessionId = started.thread.id;
};
const connectedSession = (
  state: VendorSessionState,
  models: Model[],
  values: ConfigValues,
): VendorSession => ({
  ready: readySession(state, models, values),
  run: commandRunner(state, models, values),
  stop: (): Promise<void> => closeSession(state),
});
const initializeSession = async (
  state: VendorSessionState,
  input: AgentConnectInput,
): Promise<VendorSession> => {
  if (!usesChatGpt(await initialize(state.server)))
    throw new Error('Sign in to Codex with ChatGPT to start a Session.');
  const models = await readModels(state.server);
  const values = startingValues(models, input.configOptions);
  await startThread(state, input, values);
  return connectedSession(state, models, values);
};
export async function connect(
  input: AgentConnectInput,
  listener: VendorSessionListener<VendorMessage>,
  signal: AbortSignal,
): Promise<VendorSession> {
  signal.throwIfAborted();
  const state = openSession({ connect: input, listener, signal });
  try {
    return await initializeSession(state, input);
  } catch (error) {
    await closeSession(state);
    throw error;
  }
}

const capabilities: VendorSession['ready']['capabilities'] = {
  planApproval: 'startTurn',
  stopShell: false,
  permissionFeedback: false,
};
const readySession = (
  state: VendorSessionState,
  models: Model[],
  values: ConfigValues,
): VendorSession['ready'] => ({
  vendorSessionId: state.vendorSessionId ?? '',
  configOptions: toConfigOptions(models, values),
  capabilities,
  continuedOutside: false,
});
