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
export const availableDiscovery: AgentProbe = {
  availability: 'available',
  configOptions: [],
};

export const playDiscovery = async (
  discovery: DiscoveryScenario,
  signal: AbortSignal,
): Promise<AgentProbe> => {
  discovery.signals?.push(signal);
  discovery.started?.resolve();
  const scenario = discovery.scenario ?? {
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
  };
  const { connection, close } = connectDiscovery(scenario);
  signal.addEventListener('abort', close, { once: true });
  try {
    await connection.agent.request('initialize', { protocolVersion: 1 });
    return (await discovery.result) ?? availableDiscovery;
  } finally {
    signal.removeEventListener('abort', close);
    close();
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
  const close = (): void => {
    connection.close();
    agent.close();
  };
  return { connection, close };
};
