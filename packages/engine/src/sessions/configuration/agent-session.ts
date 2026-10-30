import type { SessionConfigOption } from '@repo/contracts';
import type { SessionContext } from '../session-context';
import { requireOfferedChoice } from './offered';
import { toConfigValues } from './option-values';
import {
  applyChoices,
  sendConfigChoice,
  type ConfigurationTarget,
} from './send-choice';
import { agentOptionsWrite } from './store';
import type { ConfigurationStep } from './values';

const sessionTarget = (context: SessionContext): ConfigurationTarget => {
  if (!context.acpLease) throw new Error('No Agent session to configure');

  return {
    lease: context.acpLease,
    readers: context.acpResponseReaders,
    rejections: context.acpConfigurationRejections,
  };
};

// Sends the choice the Session is applying, rechecked against the options the Agent offers now.
export const sendChoice = (
  context: SessionContext,
): Promise<SessionConfigOption[]> => {
  const choice = context.applyingConfig;

  if (!choice) throw new Error('No Session configuration choice');
  requireOfferedChoice(context.configOptions, choice);

  return sendConfigChoice(sessionTarget(context), choice);
};

const restoredChoices = (
  context: SessionContext,
): Pick<SessionContext, 'configOptions' | 'configValues'> =>
  context.input.kind === 'existing'
    ? context
    : { configOptions: context.configOptions, configValues: [] };

// Resume can return Agent defaults: a stored Session's durable choices are reapplied before a Turn is admitted.
export async function restoreConfiguration(
  context: SessionContext,
  signal: AbortSignal,
): Promise<ConfigurationStep> {
  const { configOptions, configValues } = restoredChoices(context);

  const options = await applyChoices(
    sessionTarget(context),
    { options: configOptions, choices: configValues, required: true },
    signal,
  );

  return {
    change: { configOptions: options, configValues: toConfigValues(options) },
    writes: [agentOptionsWrite(context, options)],
  };
}
