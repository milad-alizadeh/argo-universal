import { z } from 'zod';
import { ProjectsListOutput } from '../projects/list';
import type { OperationTier } from './metadata';
import { registryOperations } from './registry';
import { operationJsonSchema } from './schema-json';

export { OperationRow, OperationTier } from './metadata';

export interface OperationDefinition {
  id: string;
  label: string;
  description: string;
  params: z.ZodType;
  result: z.ZodType;
  tier: OperationTier;
  keywords: readonly string[];
}

export const operations = {
  ...registryOperations,
  'project.list': {
    id: 'project.list',
    label: 'List Projects',
    description: 'List registered Projects and their available Checkouts.',
    params: z.strictObject({}).default({}),
    result: ProjectsListOutput,
    tier: 'read',
    keywords: ['repositories', 'folders', 'workspaces'],
  },
} as const satisfies Record<string, OperationDefinition>;

export const OperationId = z.enum(
  Object.values(operations).map(({ id }) => id),
);

export type OperationId = z.infer<typeof OperationId>;

export type OperationDescription = Omit<
  OperationDefinition,
  'params' | 'result'
> & {
  params: z.core.JSONSchema.JSONSchema;
  result: z.core.JSONSchema.JSONSchema;
};

export function describeOperation(
  operation: OperationDefinition,
): OperationDescription {
  return {
    ...operation,
    params: operationJsonSchema(operation.params),
    result: operationJsonSchema(operation.result),
  };
}
