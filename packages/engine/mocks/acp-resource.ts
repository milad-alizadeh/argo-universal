import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { AgentLaunch } from '../src/agents';
import type {
  AcpOpenInput,
  AcpSessionDestination,
  AcpSessionLease,
} from '../src/agents';

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
    _meta: { authStatus: {} },
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

interface AcpReleaseObservation {
  state: { settled: boolean };
  promise: Promise<void>;
}

export const observeAcpRelease = (
  lease: AcpSessionLease,
): AcpReleaseObservation => {
  const state = { settled: false };

  return {
    state,
    promise: lease.released.then(() => {
      state.settled = true;
    }),
  };
};
