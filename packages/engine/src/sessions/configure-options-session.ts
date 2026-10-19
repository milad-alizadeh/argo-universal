import type { SessionConfigOption } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { createAcpResponseReaders, type AcpSessionLease } from '../agents';
import { readAcpConfiguration } from './acp/acp-configuration';
import { isOfferedConfigChoice } from './admission/config-admission';

const rejections = createRejectionCounter('Agent options configuration');
const readers = createAcpResponseReaders(rejections);

// Apply the model first: its ACP response defines which remaining choices exist.
export async function configureOptionsSession(
  lease: AcpSessionLease,
  initial: SessionConfigOption[],
  saved: SessionConfigOption[],
  picks: Readonly<Record<string, string | boolean>>,
  signal: AbortSignal,
): Promise<SessionConfigOption[]> {
  let options = initial;
  const choices = {
    ...Object.fromEntries(
      saved.map((option) => [option.configId, option.currentValue]),
    ),
    ...picks,
  };
  const model = initial.find((option) => option.category === 'model')?.configId;
  const ordered = Object.entries(choices).sort(
    ([left], [right]) => Number(right === model) - Number(left === model),
  );
  for (const [configId, value] of ordered) {
    signal.throwIfAborted();
    if (!isOfferedConfigChoice(options, { configId, value })) continue;
    if (
      options.find((option) => option.configId === configId)?.currentValue ===
      value
    )
      continue;
    const response = readers['session/set_config_option'].parse(
      await lease.agent.request<unknown>('session/set_config_option', {
        sessionId: lease.sessionId,
        configId,
        value,
        ...(typeof value === 'boolean' && { type: 'boolean' }),
      }),
    );
    options = readAcpConfiguration(response.configOptions, rejections);
  }
  return options;
}
