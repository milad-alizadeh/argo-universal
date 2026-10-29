import type { SessionConfigOption, SlashCommand } from '@repo/contracts';
import { readAcpConfiguration } from '../acp/acp-configuration';
import {
  acpUpdateEvent,
  type SessionContext,
  type SessionEvent,
} from '../session-context';
import { withoutHeldChoice } from './held-options';
import { toConfigValues } from './option-values';
import {
  agentOptionsWrite,
  sessionChoicesJob,
  slashCommandsWrite,
} from './store';
import type { ConfigChoice, ConfigurationStep } from './values';

type AcpUpdate = Extract<
  SessionEvent,
  { type: typeof acpUpdateEvent }
>['notification']['update'];

type CommandsUpdate = Extract<
  AcpUpdate,
  { sessionUpdate: 'available_commands_update' }
>;

const heldChoice = (choice: ConfigChoice | null): ConfigChoice | null =>
  choice?.held ? choice : null;

const storedChoices = (
  context: SessionContext,
  options: SessionConfigOption[],
  answered: ConfigChoice | null,
): Pick<SessionContext, 'configValues' | 'heldConfig'> => ({
  configValues: toConfigValues(options),
  heldConfig: withoutHeldChoice(context.heldConfig, heldChoice(answered)),
});

/*
 * The Agent's options are now these: remember them and store them on the Session and its Agent. The held choice
 * the Agent just answered leaves the held choices.
 */
export function storedOptions(
  context: SessionContext,
  options: SessionConfigOption[],
  answered: ConfigChoice | null,
): ConfigurationStep {
  const choices = storedChoices(context, options, answered);

  return {
    change: { configOptions: options, ...choices },
    writes: [
      agentOptionsWrite(context, options),
      { job: sessionChoicesJob(context, choices) },
    ],
  };
}

const readOptions = (
  context: SessionContext,
  options: Parameters<typeof readAcpConfiguration>[0],
): SessionConfigOption[] | undefined => {
  try {
    return readAcpConfiguration(options, context.acpConfigurationRejections);
  } catch {
    return undefined;
  }
};

const commandsFrom = (update: CommandsUpdate): SlashCommand[] =>
  update.availableCommands.map(({ name, description, input }) => ({
    name,
    description,
    hint: input?.hint,
  }));

const storedCommands = (
  context: SessionContext,
  update: CommandsUpdate,
): ConfigurationStep => {
  const commands = commandsFrom(update);

  return {
    change: { slashCommands: commands },
    writes: [slashCommandsWrite(context, commands)],
  };
};

const reportedOptions = (
  context: SessionContext,
  options: Parameters<typeof readAcpConfiguration>[0],
): ConfigurationStep | undefined => {
  const read = readOptions(context, options);

  return read && storedOptions(context, read, null);
};

const reportedUpdate = (
  context: SessionContext,
  update: AcpUpdate,
): ConfigurationStep | undefined => {
  if (update.sessionUpdate === 'available_commands_update')
    return storedCommands(context, update);

  return update.sessionUpdate === 'config_option_update'
    ? reportedOptions(context, update.configOptions)
    : undefined;
};

// An Agent update reporting its options or its slash commands; one without readable options changes nothing.
export const reportAgentUpdate = (
  context: SessionContext,
  event: SessionEvent,
): ConfigurationStep | undefined =>
  event.type === acpUpdateEvent
    ? reportedUpdate(context, event.notification.update)
    : undefined;
