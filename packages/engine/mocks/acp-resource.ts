import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { AgentLaunch, DeferredAgentLaunch } from '../src/agents';
import type { AcpOpenInput, AcpSessionDestination } from '../src/agents';

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

// Resources take a launch whose command resolves only for a new connection.
export const deferLaunch = (launch: AgentLaunch): DeferredAgentLaunch => ({
  projectId: launch.projectId,
  agentId: launch.agentId,
  version: launch.version,
  resolve: async () => launch,
});

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
  launch: deferLaunch(resourceLaunch),
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
