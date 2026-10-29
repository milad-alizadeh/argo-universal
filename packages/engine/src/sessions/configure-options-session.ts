import { isModelOption, type SessionConfigOption } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { createAcpResponseReaders, type AcpSessionLease } from '../agents';
import { readAcpConfiguration } from './acp/acp-configuration';
import { isOfferedConfigChoice } from './admission/config-admission';

const rejections = createRejectionCounter('Agent options configuration');

const readers = createAcpResponseReaders(rejections);

async function configureChoice(
  lease: AcpSessionLease,
  configId: string,
  value: string | boolean,
): Promise<SessionConfigOption[]> {
  const response = readers['session/set_config_option'].parse(
    await lease.agent.request<unknown>('session/set_config_option', {
      sessionId: lease.sessionId,
      configId,
      value,
      ...(typeof value === 'boolean' && { type: 'boolean' }),
    }),
  );

  return readAcpConfiguration(response.configOptions, rejections);
}

const savedChoices = (
  saved: SessionConfigOption[],
): Record<string, string | boolean> =>
  Object.fromEntries(
    saved.map((option) => [option.configId, option.currentValue]),
  );

type ConfigurationRequest = {
  saved: SessionConfigOption[];
  picks: Readonly<Record<string, string | boolean>>;
  signal: AbortSignal;
};

// Apply the model first: its ACP response defines which remaining choices exist.
export async function configureOptionsSession(
  lease: AcpSessionLease,
  initial: SessionConfigOption[],
  request: ConfigurationRequest,
): Promise<SessionConfigOption[]> {
  let options = initial;

  const ordered = orderedChoices(initial, request.saved, request.picks);

  for (const [configId, value] of ordered) {
    request.signal.throwIfAborted();

    if (!needsChange(options, configId, value)) continue;

    options = await configureChoice(lease, configId, value);
  }

  request.signal.throwIfAborted();

  return options;
}

function orderedChoices(
  initial: SessionConfigOption[],
  saved: SessionConfigOption[],
  picks: Readonly<Record<string, string | boolean>>,
): [string, string | boolean][] {
  const choices = {
    ...savedChoices(saved),
    ...picks,
  };

  const model = initial.find(isModelOption)?.configId;

  return Object.entries(choices).sort(
    ([left], [right]) => Number(right === model) - Number(left === model),
  );
}

function needsChange(
  options: SessionConfigOption[],
  configId: string,
  value: string | boolean,
): boolean {
  return (
    isOfferedConfigChoice(options, { configId, value }) &&
    options.find((option) => option.configId === configId)?.currentValue !==
      value
  );
}
