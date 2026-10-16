import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

export const exitWithStderr: ScriptedStep = {
  type: 'exit',
  code: 17,
  stderr: 'Agent fixture failed\n',
};

export const processExitScenarios = {
  'initialize-exit': {
    steps: [],
    responses: { initialize: [{ steps: [exitWithStderr] }] },
  },
  'open-exit': {
    steps: [],
    responses: { 'session/new': [{ steps: [exitWithStderr] }] },
  },
} satisfies Record<string, ScriptedScenario>;
