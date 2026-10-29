import { fileURLToPath } from 'node:url';
import { createAgentMetadata, type AgentIdentity } from '@repo/mocks/agent';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import type { EngineInput } from '../src/engine/machine';
import { createScriptedAgentProcess } from './scripted-agent';

const cliEntry = fileURLToPath(
  new URL('../../../apps/cli/bin/argo.mjs', import.meta.url),
);

export const scriptedEngineInput = (
  scenario: ScriptedScenario = { steps: [] },
  identity = 'mock',
): Pick<EngineInput, 'acp' | 'cliEntry'> & {
  agent: ReturnType<typeof createScriptedAgentProcess>;
  fixtureAgents: AgentIdentity[];
} => {
  const agent = createScriptedAgentProcess(scenario);

  return {
    cliEntry,
    agent,
    fixtureAgents: [createAgentMetadata(identity)],
    acp: agent,
  };
};
