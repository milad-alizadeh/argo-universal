import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

const question: ScriptedStep = {
  type: 'elicitation',
  request: {
    mode: 'form',
    message: 'Choose the next step',
    requestedSchema: {
      type: 'object',
      properties: { title: { type: 'string', title: 'Title' } },
    },
  },
};

export const notificationScenarios = {
  'successive-input': {
    configOptions: acpConfiguration,
    steps: [question, question],
  },
} satisfies Record<string, ScriptedScenario>;
