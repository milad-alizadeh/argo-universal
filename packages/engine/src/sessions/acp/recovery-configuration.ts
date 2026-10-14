import type { InitialConfigOption, SessionConfigOption } from '@repo/contracts';
import type { createRejectionCounter } from '@repo/machine-log';
import { createAcpResponseReaders, type AcpSessionLease } from '../../agents';
import { validateConfigChoice } from '../session-admission';
import { readAcpConfiguration } from './acp-configuration';

type RecoveryConfiguration = {
  lease: AcpSessionLease;
  values: InitialConfigOption[];
  readers: ReturnType<typeof createAcpResponseReaders>;
  rejections: Pick<ReturnType<typeof createRejectionCounter>, 'report'>;
};

const applyChoice = async (
  input: RecoveryConfiguration,
  choice: InitialConfigOption,
): Promise<SessionConfigOption[]> => {
  const response = input.readers['session/set_config_option'].parse(
    await input.lease.agent.request<unknown>('session/set_config_option', {
      sessionId: input.lease.sessionId,
      ...choice,
      ...(typeof choice.value === 'boolean' && { type: 'boolean' }),
    }),
  );

  return readAcpConfiguration(response.configOptions, input.rejections);
};

const isSelected = (
  options: SessionConfigOption[],
  choice: InitialConfigOption,
): boolean =>
  options.some(
    (option) =>
      option.configId === choice.configId &&
      option.currentValue === choice.value,
  );

const requireSelected = (
  options: SessionConfigOption[],
  values: InitialConfigOption[],
): void => {
  for (const choice of values)
    if (!isSelected(options, choice))
      throw new Error(
        `The Agent did not restore ${choice.configId}=${String(choice.value)} during recovery`,
      );
};

export const restoreRecoveryConfiguration = async (
  input: RecoveryConfiguration,
): Promise<SessionConfigOption[]> => {
  let options = readAcpConfiguration(
    input.lease.response.configOptions,
    input.rejections,
  );

  for (const choice of input.values) {
    if (isSelected(options, choice)) continue;
    validateConfigChoice(options, choice);
    options = await applyChoice(input, choice);
  }

  requireSelected(options, input.values);

  return options;
};
