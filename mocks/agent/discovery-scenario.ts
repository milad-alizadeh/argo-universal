import {
  client,
  ndJsonStream,
  type ClientConnection,
} from '@agentclientprotocol/sdk';
import type { AgentProbe } from '@repo/agents';
import { createScriptedAgent } from './scripted-agent.ts';
import type { ScriptedScenario } from './scripted-scenario.ts';

export type DiscoveryScenario = {
  result?: AgentProbe | Promise<AgentProbe>;
  scenario?: ScriptedScenario;
  waitFor?: Promise<void>;
  error?: string;
  started?: { resolve: () => void };
  signals?: { push: (signal: AbortSignal) => unknown };
};
export const availableDiscovery: AgentProbe = { availability: 'available' };

export const playDiscovery = async (
  discovery: DiscoveryScenario,
  signal: AbortSignal,
): Promise<AgentProbe> => {
  observeDiscovery(discovery, signal);
  const scenario = discovery.scenario ?? initializationScenario(discovery);
  const { connection, close } = connectDiscovery(scenario);
  signal.addEventListener('abort', close, { once: true });
  try {
    await connection.agent.request('initialize', { protocolVersion: 1 });
    return (await discovery.result) ?? availableDiscovery;
  } finally {
    endDiscovery(signal, close);
  }
};

const connectDiscovery = (
  scenario: ScriptedScenario,
): { connection: ClientConnection; close: () => void } => {
  const toAgent = new TransformStream<Uint8Array, Uint8Array>();
  const fromAgent = new TransformStream<Uint8Array, Uint8Array>();
  const agent = createScriptedAgent(scenario).connect(
    fromAgent.writable,
    toAgent.readable,
  );
  const connection = client().connect(
    ndJsonStream(toAgent.writable, fromAgent.readable),
  );
  return { connection, close: () => closeDiscovery(connection, agent) };
};

const closeDiscovery = (
  connection: ClientConnection,
  agent: { close: () => void },
): void => {
  connection.close();
  agent.close();
};
const observeDiscovery = (
  discovery: Pick<DiscoveryScenario, 'signals' | 'started'>,
  signal: AbortSignal,
): void => {
  discovery.signals?.push(signal);
  discovery.started?.resolve();
};
const initializationScenario = (
  discovery: Pick<DiscoveryScenario, 'waitFor' | 'error'>,
): ScriptedScenario => ({
  steps: [],
  responses: {
    initialize: [
      {
        ...(discovery.waitFor ? { waitFor: discovery.waitFor } : {}),
        ...(discovery.error
          ? { error: { code: -32603, message: discovery.error } }
          : {}),
      },
    ],
  },
});

const endDiscovery = (signal: AbortSignal, close: () => void): void => {
  signal.removeEventListener('abort', close);
  close();
};
