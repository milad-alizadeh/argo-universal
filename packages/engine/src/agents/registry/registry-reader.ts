import type { ACPAgent, ACPAgentRegistry } from '@repo/contracts';
import {
  registryAgentSchema,
  registrySchema,
} from '@repo/contracts/registry-schema';
import { createRejectionCounter } from '@repo/machine-log';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { z } from 'zod';
import {
  type CompiledSchema,
  compileSchema,
} from '../acp/connection/schema-reader';

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

const compiledRegistry = compileSchema<ACPAgentRegistry>(
  validator,
  registrySchema,
  {
    rejected: 'Rejected malformed registry metadata',
    invalid: (): string => 'Registry metadata is malformed',
  },
);

const compiledAgent = compileSchema<ACPAgent>(validator, registryAgentSchema, {
  rejected: 'Rejected malformed stored Agent metadata',
  invalid: (): string => 'Stored Agent metadata is malformed',
});

// Registry Agent metadata already decoded from a stored JSON document.
export const RegistryAgent = z.custom<ACPAgent>((value) =>
  compiledAgent.accepts(value),
);

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
  if (metadata === null) return compiledAgent.reader(rejections).parse(null);

  return decodeRegistryJson(metadata, compiledAgent, rejections);
}

function parseRegistry(
  text: string,
  rejections: RegistryRejections,
): ACPAgentRegistry {
  const registry = decodeRegistryJson(text, compiledRegistry, rejections);

  return requireUniqueRegistryAgents(registry, rejections);
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

// Decodes registry JSON and returns it only when it matches the schema; malformed JSON has its own message.
function decodeRegistryJson<Value>(
  text: string,
  compiled: CompiledSchema<Value>,
  rejections: RegistryRejections,
): Value {
  let decoded: unknown;

  try {
    decoded = JSON.parse(text);
  } catch (error) {
    rejections.report('Rejected malformed registry JSON', error);
    throw new Error('Registry JSON is malformed');
  }

  return compiled.reader(rejections).parse(decoded);
}

function rejectRegistryValue(
  rejections: RegistryRejections,
  message: string,
  cause: unknown,
): never {
  rejections.report(message, cause);
  throw new Error(message);
}
