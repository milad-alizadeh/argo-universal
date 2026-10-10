import { ndJsonStream } from '@agentclientprotocol/sdk';
import { createScriptedAgent } from '@repo/mocks/agent/scripted-agent';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import type { AcpProcess, AgentLaunch } from '../src/services/agents';

// The scripted Agent as an in-memory ACP process: the Engine owns it like a child, with no spawn.
export const createScriptedAgentLauncher =
  (
    scenarioFor: (launch: AgentLaunch) => ScriptedScenario,
  ): ((launch: AgentLaunch) => Promise<AcpProcess>) =>
  async (launch) => {
    const toAgent = new TransformStream<Uint8Array, Uint8Array>();
    const fromAgent = new TransformStream<Uint8Array, Uint8Array>();
    const connection = createScriptedAgent(scenarioFor(launch)).connect(
      fromAgent.writable,
      toAgent.readable,
    );
    return {
      stream: ndJsonStream(toAgent.writable, fromAgent.readable),
      exited: connection.closed,
      terminate: async () => {
        connection.close();
        await connection.closed;
      },
    };
  };
