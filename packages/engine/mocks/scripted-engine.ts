import { createAgentMetadata, type AgentIdentity } from '@repo/mocks/agent';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import type { EngineInput } from '../src/engine/machine';
import { createScriptedAgentProcess } from './scripted-agent';

export const scriptedEngineInput = (
  scenario: ScriptedScenario = { steps: [] },
  identity = 'mock',
): Pick<EngineInput, 'acp'> & {
  agent: ReturnType<typeof createScriptedAgentProcess>;
  fixtureAgents: AgentIdentity[];
} => {
  const agent = createScriptedAgentProcess(scenario);

  return {
    agent,
    fixtureAgents: [createAgentMetadata(identity)],
    acp: agent,
  };
};
