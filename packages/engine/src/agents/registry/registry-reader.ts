import type { ACPAgent, ACPAgentRegistry } from '@repo/contracts';
import {
  registryAgentSchema,
  registrySchema,
} from '@repo/contracts/registry-schema';
import { createRejectionCounter } from '@repo/machine-log';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { z } from 'zod';

type RegistryRejections = ReturnType<typeof createRejectionCounter>;

export type RegistryReader = {
  parse(text: string): ACPAgentRegistry;
  parseAgent(metadata: string | null): ACPAgent;
  count(): number;
  reject(message: string, cause?: unknown): never;
};

const validator = addFormats(new Ajv({ strict: false })).addSchema(
  registryAgentSchema,
);

const acceptsRegistry = validator.compile<ACPAgentRegistry>(registrySchema);

const acceptsAgent = validator.compile<ACPAgent>(registryAgentSchema);

// Registry Agent metadata already decoded from a stored JSON document.
export const RegistryAgent = z.custom<ACPAgent>((value) => acceptsAgent(value));

export function createRegistryReader(): RegistryReader {
  const rejections = createRejectionCounter('Agent registry');

  return {
    parse: (text): ACPAgentRegistry => parseRegistry(text, rejections),
    parseAgent: (metadata): ACPAgent =>
      parseRegistryAgent(metadata, rejections),
    count: (): number => rejections.count(),
    reject: (message, cause): never =>
      rejectRegistryValue(rejections, message, cause),
  };
}

function parseRegistryAgent(
  metadata: string | null,
  rejections: RegistryRejections,
): ACPAgent {
  const agent =
    metadata === null
      ? undefined
      : decodeRegistryJson(metadata, acceptsAgent, rejections);

  if (agent) return agent;
  rejections.report(
    'Rejected malformed stored Agent metadata',
    acceptsAgent.errors,
  );
  throw new Error('Stored Agent metadata is malformed');
}

function parseRegistry(
  text: string,
  rejections: RegistryRejections,
): ACPAgentRegistry {
  const registry = decodeRegistryJson(text, acceptsRegistry, rejections);

  if (registry) return requireUniqueRegistryAgents(registry, rejections);
  rejections.report(
    'Rejected malformed registry metadata',
    acceptsRegistry.errors,
  );
  throw new Error('Registry metadata is malformed');
}

function requireUniqueRegistryAgents(
  registry: ACPAgentRegistry,
  rejections: RegistryRejections,
): ACPAgentRegistry {
  const identities = new Set(registry.agents.map(({ id }) => id));

  if (identities.size === registry.agents.length) return registry;

  return rejectRegistryValue(
    rejections,
    'Registry contains duplicate Agent identities',
    null,
  );
}

// Decodes registry JSON and returns it only when it matches the schema.
function decodeRegistryJson<Value>(
  text: string,
  accepts: ValidateFunction<Value>,
  rejections: RegistryRejections,
): Value | undefined {
  try {
    const decoded = JSON.parse(text);

    return accepts(decoded) ? decoded : undefined;
  } catch (error) {
    rejections.report('Rejected malformed registry JSON', error);
    throw new Error('Registry JSON is malformed');
  }
}

function rejectRegistryValue(
  rejections: RegistryRejections,
  message: string,
  cause: unknown,
): never {
  rejections.report(message, cause);
  throw new Error(message);
}
