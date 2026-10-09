import type { ACPAgent, ACPAgentRegistry } from '@repo/contracts';
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
const acceptsAgent = validator.compile<ACPAgent>(registryAgentSchema);
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
  parseAgent(value: unknown): ACPAgent;
  count(): number;
  reject(message: string, details?: unknown): never;
} {
  const rejections = createRejectionCounter('Agent registry');
  return {
    parse: (value): ACPAgentRegistry => parseRegistry(value, rejections),
    parseAgent: (value): ACPAgent => parseRegistryAgent(value, rejections),
    count: (): number => rejections.count(),
    reject: (message, details): never =>
      rejectRegistryValue(rejections, message, details),
  };
}

function parseRegistryAgent(
  value: unknown,
  rejections: ReturnType<typeof createRejectionCounter>,
): ACPAgent {
  const decoded =
    typeof value === 'string' ? decodeRegistryJson(value, rejections) : value;
  if (acceptsAgent(decoded)) return decoded;
  rejections.report(
    'Rejected malformed stored Agent metadata',
    acceptsAgent.errors,
  );
  throw new Error('Stored Agent metadata is malformed');
}

function parseRegistry(
  value: unknown,
  rejections: ReturnType<typeof createRejectionCounter>,
): ACPAgentRegistry {
  const decoded =
    typeof value === 'string' ? decodeRegistryJson(value, rejections) : value;
  if (acceptsRegistry(decoded))
    return requireUniqueRegistryAgents(decoded, rejections);
  rejections.report(
    'Rejected malformed registry metadata',
    acceptsRegistry.errors,
  );
  throw new Error('Registry metadata is malformed');
}

function requireUniqueRegistryAgents(
  registry: ACPAgentRegistry,
  rejections: ReturnType<typeof createRejectionCounter>,
): ACPAgentRegistry {
  const identities = new Set(registry.agents.map(({ id }) => id));
  if (identities.size === registry.agents.length) return registry;
  return rejectRegistryValue(
    rejections,
    'Registry contains duplicate Agent identities',
    null,
  );
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

function rejectRegistryValue(
  rejections: ReturnType<typeof createRejectionCounter>,
  message: string,
  details: unknown,
): never {
  rejections.report(message, details);
  throw new Error(message);
}
