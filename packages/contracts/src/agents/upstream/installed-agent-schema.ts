import { z } from 'zod';
import { AgentServerEnvironment, RegistryAgentId } from '../servers';
import type { ACPAgent } from './registry.gen';
import { registryAgentSchema } from './schema';

const argoProperty = (
  schema: z.ZodObject,
  key: string,
): z.core.JSONSchema.JSONSchema => {
  const property = z.toJSONSchema(schema).properties?.[key];

  if (typeof property !== 'object')
    throw new Error(`Installed Agent field ${key} has no JSON Schema`);

  return property;
};

// The Registry's own properties describe the fields it owns (ADR-0016 #12); Argo's Zod describes the rest.
export const installedAgentSchema = {
  type: 'object',
  properties: {
    id: argoProperty(RegistryAgentId, 'id'),
    name: registryAgentSchema.properties.name,
    icon: registryAgentSchema.properties.icon,
    version: registryAgentSchema.properties.version,
    env: z.toJSONSchema(AgentServerEnvironment, { target: 'draft-7' }),
  },
  required: ['id', 'name', 'version', 'env'] as const,
  additionalProperties: false,
};

type FieldTypes = ACPAgent & RegistryAgentId & { env: AgentServerEnvironment };

type DescribedKey = keyof typeof installedAgentSchema.properties;

type RequiredKey = (typeof installedAgentSchema.required)[number];

type Described = Required<Pick<FieldTypes, RequiredKey>> &
  Partial<Pick<FieldTypes, Exclude<DescribedKey, RequiredKey>>>;

// The value the schema accepts, typed field by field from each property's source.
export type DescribedInstalledAgent = {
  [Key in keyof Described]: Described[Key];
};
