import type { SlashCommand } from '@repo/contracts';
import type {
  ComposerSuggestion,
  SlashCommandEntry,
  SuggestionSource,
} from '@repo/kit/primitives/controls/rich-textarea';

const nameStartsWith = (command: SlashCommand, needle: string): boolean =>
  command.name.toLowerCase().startsWith(needle);

function matchingCommands(
  commands: readonly SlashCommand[],
  query: string,
): SlashCommand[] {
  const needle = query.toLowerCase();

  const prefixes = commands.filter((command) =>
    nameStartsWith(command, needle),
  );

  const descriptions = commands.filter(
    (command) =>
      !nameStartsWith(command, needle) &&
      command.description.toLowerCase().includes(needle),
  );

  return [...prefixes, ...descriptions];
}

const commandSuggestion = (command: SlashCommand): ComposerSuggestion => ({
  id: command.name,
  label: `/${command.name}`,
  detail: command.description,
  insert: `/${command.name} `,
  command: command.name,
});

const commandEntry = ({ name, hint }: SlashCommand): SlashCommandEntry =>
  hint === undefined ? { name } : { name, hint };

// Name prefixes outrank description matches; the Agent's order breaks ties. The list limits the results.
export function slashCommandSource(
  commands: readonly SlashCommand[],
): SuggestionSource {
  return {
    id: 'agent-slash-commands',
    title: 'Slash commands',
    query: (query) => matchingCommands(commands, query).map(commandSuggestion),
    commands: commands.map(commandEntry),
  };
}
