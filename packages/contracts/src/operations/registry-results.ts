import { z } from 'zod';
import { type AgentServer } from '../agents/servers';
import type { ACPAgent } from '../agents/upstream/registry.gen';
import { registryAgentSchema } from '../agents/upstream/schema';
import { installedAgentSchema } from './registry-result-json';
import {
  validateRegistryEntry,
  validateInstalledAgent,
} from './registry-validators.gen.js';
import {
  OperationSchemaRepresentation,
  operationSchemaJson,
} from './schema-json';

export const RegistryEntry = z
  .custom<ACPAgent>(validateRegistryEntry)
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

export const InstalledAgentResult = z
  .custom<AgentServer>(validateInstalledAgent)
  .register(
    operationSchemaJson,
    OperationSchemaRepresentation.parse(installedAgentSchema),
  );
