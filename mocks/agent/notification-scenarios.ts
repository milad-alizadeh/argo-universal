import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';
import { slashCommandsUpdate } from './slash-commands-update.ts';

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

// An Agent that offers one Slash command, sent once each new Session has opened.
const offeringCommand = (
  name: string,
  description: string,
): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps: [],
  afterOpening: [slashCommandsUpdate([{ name, description }])],
});

export const notificationScenarios = {
  'successive-input': {
    configOptions: acpConfiguration,
    steps: [question, question],
  },
  'slash-commands-review': offeringCommand('review', 'Review changes'),
  'slash-commands-deploy': offeringCommand('deploy', 'Deploy the build'),
} satisfies Record<string, ScriptedScenario>;
