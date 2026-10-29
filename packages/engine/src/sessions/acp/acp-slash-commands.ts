import type { AvailableCommand } from '@agentclientprotocol/sdk';
import type { SlashCommand } from '@repo/contracts';

export const toSlashCommands = (
  commands: readonly AvailableCommand[],
): SlashCommand[] =>
  commands.map(({ name, description, input }) => ({
    name,
    description,
    hint: input?.hint,
  }));
