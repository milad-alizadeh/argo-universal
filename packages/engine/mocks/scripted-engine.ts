import { fileURLToPath } from 'node:url';
import { createAgentMetadata, type AgentIdentity } from '@repo/mocks/agent';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import type { EngineInput } from '../src/engine/machine';
import { createScriptedAgentProcess } from './scripted-agent';

const cliEntry = fileURLToPath(
  new URL('../../../apps/cli/bin/argo.mjs', import.meta.url),
);

// A scripted Agent starts no `argo mcp`, so its grace never ends unless a test of that notice sets one.
const scriptedGrace = { argoToolsGraceMs: Number.POSITIVE_INFINITY };

type ScriptedEngineInput = Pick<
  EngineInput,
  'acp' | 'cliEntry' | 'argoToolsGraceMs'
> & {
  agent: ReturnType<typeof createScriptedAgentProcess>;
  fixtureAgents: AgentIdentity[];
};

export const scriptedEngineInput = (
  scenario: ScriptedScenario = { steps: [] },
  identity = 'mock',
): ScriptedEngineInput => {
  const agent = createScriptedAgentProcess(scenario);

  return {
    cliEntry,
    agent,
    fixtureAgents: [createAgentMetadata(identity)],
    acp: agent,
    ...scriptedGrace,
  };
};
