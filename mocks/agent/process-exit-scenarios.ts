import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

const exit: ScriptedStep = {
  type: 'exit',
  code: 17,
  stderr: 'Agent fixture failed\n',
};

export const processExitScenarios = {
  'initialize-exit': {
    steps: [],
    responses: { initialize: [{ steps: [exit] }] },
  },
  'open-exit': { steps: [], responses: { 'session/new': [{ steps: [exit] }] } },
} satisfies Record<string, ScriptedScenario>;
