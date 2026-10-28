import { z } from 'zod';
import { AgentServerEnvironment, RegistryAgentId } from '../agents/servers';
import { registryAgentSchema } from '../agents/upstream/schema';

export const installedAgentSchema = {
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
