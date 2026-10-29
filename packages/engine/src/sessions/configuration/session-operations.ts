import type { SessionConfigOption } from '@repo/contracts';
import type { SessionContext } from '../session-context';
import { requireOfferedChoice, toConfigValues } from './choices';
import {
  applyChoices,
  sendConfigChoice,
  type ConfigurationTarget,
} from './send-choice';

const sessionTarget = (context: SessionContext): ConfigurationTarget => {
  if (!context.acpLease) throw new Error('No Agent session to configure');

  return {
    lease: context.acpLease,
    readers: context.acpResponseReaders,
    rejections: context.acpConfigurationRejections,
  };
};

// Sends the queued choice the Session is applying, rechecked against the options the Agent offers now.
export const sendQueuedChoice = (
  context: SessionContext,
): Promise<SessionConfigOption[]> => {
  const choice = context.applyingConfig;

  if (!choice) throw new Error('No Session configuration choice');
  requireOfferedChoice(context.configOptions, choice);

  return sendConfigChoice(sessionTarget(context), choice);
};

export type RestoredConfiguration = Pick<
  SessionContext,
  'configOptions' | 'configValues'
>;

const restoredChoices = (context: SessionContext): RestoredConfiguration =>
  context.input.kind === 'existing'
    ? context
    : { configOptions: context.configOptions, configValues: [] };

// Resume can return Agent defaults: a stored Session's durable choices are reapplied before a Turn is admitted.
export async function restoreConfiguration(
  context: SessionContext,
  signal: AbortSignal,
): Promise<RestoredConfiguration> {
  const { configOptions, configValues } = restoredChoices(context);

  const options = await applyChoices(
    sessionTarget(context),
    { options: configOptions, choices: configValues, required: true },
    signal,
  );

  return { configOptions: options, configValues: toConfigValues(options) };
}
