import type { AvailableCommand } from '@agentclientprotocol/sdk';
import type { ScriptedStep } from './scripted-scenario.ts';

// The update an Agent sends to replace its Slash command list.
export const slashCommandsUpdate = (
  commands: readonly AvailableCommand[],
): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'available_commands_update',
    availableCommands: [...commands],
  },
});
