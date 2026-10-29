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
  // Offers a `review` Slash command, sent once each new Session has opened.
  'slash-commands': {
    configOptions: acpConfiguration,
    steps: [],
    afterOpening: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [
            { name: 'review', description: 'Review changes' },
          ],
        },
      },
    ],
  },
} satisfies Record<string, ScriptedScenario>;
