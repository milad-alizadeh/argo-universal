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

const commandsUpdate = (name: string, description: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'available_commands_update',
    availableCommands: [{ name, description }],
  },
});

// An Agent that offers one Slash command, sent once each new Session has opened.
const offeringCommand = (
  name: string,
  description: string,
): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps: [],
  afterOpening: [commandsUpdate(name, description)],
});

export const notificationScenarios = {
  'successive-input': {
    configOptions: acpConfiguration,
    steps: [question, question],
  },
  'slash-commands': offeringCommand('review', 'Review changes'),
  'slash-commands-deploy': offeringCommand('deploy', 'Deploy the build'),
} satisfies Record<string, ScriptedScenario>;
