import { createAgentMetadata } from '@repo/mocks/agent';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import type { EngineInput } from '../src/engine/machine';
import { resourceLaunch } from './acp-resource';
import { createScriptedAgentProcess } from './scripted-agent';

export const scriptedEngineInput = (
  scenario: ScriptedScenario = { steps: [] },
  identity = 'mock',
): Pick<EngineInput, 'adapters' | 'acp' | 'resolveAgentLaunch'> & {
  agent: ReturnType<typeof createScriptedAgentProcess>;
} => {
  const agent = createScriptedAgentProcess(scenario);
  return {
    agent,
    adapters: [createAgentMetadata({}, identity)],
    acp: agent,
    resolveAgentLaunch: async (input) => ({
      ...resourceLaunch,
      agentId: input.agent,
      projectId: input.projectId,
      cwd: input.projectPath,
    }),
  };
};
