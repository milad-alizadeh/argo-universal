import {
  agent,
  ndJsonStream,
  type AgentConnection,
  type AgentRequestHandlersByMethod,
  type SessionNotification,
  type InitializeResponse,
  type NewSessionResponse,
  type CloseSessionResponse,
  type LoadSessionResponse,
  type ResumeSessionResponse,
  type PromptResponse,
  type SetSessionConfigOptionResponse,
  type AgentNotificationHandlersByMethod,
} from '@agentclientprotocol/sdk';
import type {
  AcpOpenInput,
  AcpSessionDestination,
  AgentLaunch,
  AcpProcess,
  AcpSessionLease,
} from '../src/services/agents';

export const resourceLaunch: AgentLaunch = {
  projectId: 'project',
  agentId: 'agent',
  executable: '/agent',
  version: '1',
  args: [],
  cwd: '/project',
  env: {},
  authContext: 'subscription',
};
export const createResourceDestination = (
  updates: SessionNotification[] = [],
): AcpSessionDestination => ({
  update: (notification): undefined => {
    updates.push(notification);
  },
  failed: () => {},
  requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
  createElicitation: () => ({ action: 'cancel' }),
});
export const createResourceOpening = (
  destination = createResourceDestination(),
): AcpOpenInput => ({
  launch: resourceLaunch,
  opening: {
    method: 'session/new',
    params: { cwd: '/checkout', mcpServers: [] },
  },
  destination,
});
export const resourceInitialization = {
  protocolVersion: 1,
  agentCapabilities: {
    loadSession: true,
    sessionCapabilities: { close: {}, resume: {} },
  },
};
export const createResourceUpdate = (
  sessionId: string,
): SessionNotification => ({
  sessionId,
  update: {
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text: sessionId },
  },
});

type ResourcePeerInput = {
  autoExit?: boolean;
  initialize?: AgentRequestHandlersByMethod['initialize'];
  newSession?: AgentRequestHandlersByMethod['session/new'];
  closeSession?: AgentRequestHandlersByMethod['session/close'];
  loadSession?: AgentRequestHandlersByMethod['session/load'];
  resumeSession?: AgentRequestHandlersByMethod['session/resume'];
  prompt?: AgentRequestHandlersByMethod['session/prompt'];
  setConfigOption?: AgentRequestHandlersByMethod['session/set_config_option'];
  cancel?: AgentNotificationHandlersByMethod['session/cancel'];
};
type ResourceProcess = {
  launch: AgentLaunch;
  connection: AgentConnection;
  exited: ReturnType<typeof Promise.withResolvers<void>>;
  terminations: number;
};
export const requireResourceProcessAt = (
  processes: ResourceProcess[],
  index = 0,
): ResourceProcess => {
  const process = processes[index];
  if (!process) throw new Error('Missing ACP process');
  return process;
};
export const createResourcePeer = (
  input: ResourcePeerInput = {},
): {
  processes: ResourceProcess[];
  launchProcess: (launch: AgentLaunch) => Promise<AcpProcess>;
} => {
  const processes: ResourceProcess[] = [];
  let nextSession = 0;
  return {
    processes,
    launchProcess: async (launch): Promise<AcpProcess> => {
      const outgoing = new TransformStream<Uint8Array, Uint8Array>();
      const incoming = new TransformStream<Uint8Array, Uint8Array>();
      const connection = agent()
        .onRequest(
          'initialize',
          input.initialize ??
            ((): InitializeResponse => resourceInitialization),
        )
        .onRequest(
          'session/new',
          input.newSession ??
            ((): NewSessionResponse => ({
              sessionId: `owned-${++nextSession}`,
            })),
        )
        .onRequest(
          'session/close',
          input.closeSession ?? ((): CloseSessionResponse => ({})),
        )
        .onRequest(
          'session/load',
          input.loadSession ?? ((): LoadSessionResponse => ({})),
        )
        .onRequest(
          'session/resume',
          input.resumeSession ?? ((): ResumeSessionResponse => ({})),
        )
        .onRequest(
          'session/prompt',
          input.prompt ??
            ((): PromptResponse => ({
              stopReason: 'end_turn',
            })),
        )
        .onRequest(
          'session/set_config_option',
          input.setConfigOption ??
            ((): SetSessionConfigOptionResponse => ({ configOptions: [] })),
        )
        .onNotification('session/cancel', input.cancel ?? ((): void => {}))
        .connect(ndJsonStream(incoming.writable, outgoing.readable));
      const process = {
        launch,
        connection,
        exited: Promise.withResolvers<void>(),
        terminations: 0,
      };
      processes.push(process);
      return {
        stream: ndJsonStream(outgoing.writable, incoming.readable),
        exited: process.exited.promise,
        terminate: async () => {
          process.terminations += 1;
          connection.close();
          if (input.autoExit !== false) process.exited.resolve();
        },
      };
    },
  };
};

export const observeAcpRelease = (
  lease: AcpSessionLease,
): {
  state: { settled: boolean };
  promise: Promise<void>;
} => {
  const state = { settled: false };
  return {
    state,
    promise: lease.released.then(() => {
      state.settled = true;
    }),
  };
};
