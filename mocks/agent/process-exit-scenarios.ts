import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

export const agentExit: ScriptedStep = {
  type: 'exit',
  code: 17,
  stderr: 'Agent fixture failed\n',
};

export const exitScenarios = {
  'initialize-exit': {
    steps: [],
    responses: { initialize: [{ steps: [agentExit] }] },
  },
  'open-exit': {
    steps: [],
    responses: { 'session/new': [{ steps: [agentExit] }] },
  },
} satisfies Record<string, ScriptedScenario>;
