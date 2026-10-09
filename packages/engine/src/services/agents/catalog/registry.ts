import type { ACPAgentRegistry } from '@repo/contracts';
import {
  registryAgentSchema,
  registrySchema,
} from '@repo/contracts/registry-schema';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRejectionCounter } from '../../../lib/count-rejections';

const validator = addFormats(new Ajv({ strict: false })).addSchema(
  registryAgentSchema,
);
const acceptsRegistry = validator.compile<ACPAgentRegistry>(registrySchema);
export const registryUrl =
  'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';

export interface RegistryPort {
  readRegistry(signal: AbortSignal): Promise<unknown>;
}

export const publicRegistry: RegistryPort = {
  readRegistry: async (signal): Promise<unknown> => {
    const response = await fetch(registryUrl, { signal });
    if (!response.ok)
      throw new Error(`Registry returned HTTP ${response.status}`);
    return response.text();
  },
};

export function createRegistryReader(): {
  parse(value: unknown): ACPAgentRegistry;
  count(): number;
} {
  const rejections = createRejectionCounter('Agent registry');
  return {
    parse: (value): ACPAgentRegistry => parseRegistry(value, rejections),
    count: (): number => rejections.count(),
  };
}

function parseRegistry(
  value: unknown,
  rejections: ReturnType<typeof createRejectionCounter>,
): ACPAgentRegistry {
  const decoded =
    typeof value === 'string' ? decodeRegistryJson(value, rejections) : value;
  if (acceptsRegistry(decoded)) return decoded;
  rejections.report(
    'Rejected malformed registry metadata',
    acceptsRegistry.errors,
  );
  throw new Error('Registry metadata is malformed');
}

function decodeRegistryJson(
  text: string,
  rejections: ReturnType<typeof createRejectionCounter>,
): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    rejections.report('Rejected malformed registry JSON', error);
    throw new Error('Registry JSON is malformed');
  }
}
