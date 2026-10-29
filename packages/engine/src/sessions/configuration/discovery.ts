import type { SessionConfigOption } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { createAcpResponseReaders, type AcpSessionLease } from '../../agents';
import { readAcpConfiguration } from '../acp/acp-configuration';
import { applyChoices } from './send-choice';
import type { AgentConfigValue } from './values';

const rejections = createRejectionCounter('Agent options');

const readers = createAcpResponseReaders(rejections);

type DiscoveryChoices = {
  saved: SessionConfigOption[];
  picks: Readonly<Record<string, string | boolean>>;
  signal: AbortSignal;
};

// Picks win over the saved values of the same option.
const choicesOf = ({ saved, picks }: DiscoveryChoices): AgentConfigValue[] =>
  Object.entries({
    ...Object.fromEntries(
      saved.map((option) => [option.configId, option.currentValue]),
    ),
    ...picks,
  }).map(([configId, value]) => ({ configId, value }));

// The options an Agent session offers once the saved choices and picks it still offers are applied.
export const discoverOptions = (
  lease: AcpSessionLease,
  request: DiscoveryChoices,
): Promise<SessionConfigOption[]> =>
  applyChoices(
    { lease, readers, rejections },
    {
      options: readAcpConfiguration(lease.response.configOptions, rejections),
      choices: choicesOf(request),
      required: false,
    },
    request.signal,
  );
