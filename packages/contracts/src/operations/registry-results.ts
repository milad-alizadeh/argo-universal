import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { z } from 'zod';
import {
  AgentServerEnvironment,
  RegistryAgentId,
  type AgentServer,
} from '../agents/servers';
import type { ACPAgent } from '../agents/upstream/registry.gen';
import { registryAgentSchema } from '../agents/upstream/schema';
import {
  OperationSchemaRepresentation,
  operationSchemaJson,
} from './schema-json';

const validator = addFormats(new Ajv({ strict: false }));

export const RegistryEntry = z
  .custom<ACPAgent>(validator.compile<ACPAgent>(registryAgentSchema))
  .register(
    operationSchemaJson,
    OperationSchemaRepresentation.parse(registryAgentSchema),
  );

export const RegistryResult = z.strictObject({
  agents: z.array(
    z.strictObject({
      entry: RegistryEntry,
      support: z.enum(['binary', 'npx', 'unavailable']),
    }),
  ),
  error: z.string().nullable(),
});

const installedAgentSchema = {
  type: 'object',
  properties: {
    ...z.toJSONSchema(RegistryAgentId).properties,
    name: registryAgentSchema.properties.name,
    icon: registryAgentSchema.properties.icon,
    version: registryAgentSchema.properties.version,
    env: z.toJSONSchema(AgentServerEnvironment, { target: 'draft-7' }),
  },
  required: ['id', 'name', 'version', 'env'],
  additionalProperties: false,
};

export const InstalledAgentResult = z
  .custom<AgentServer>(validator.compile<AgentServer>(installedAgentSchema))
  .register(
    operationSchemaJson,
    OperationSchemaRepresentation.parse(installedAgentSchema),
  );
