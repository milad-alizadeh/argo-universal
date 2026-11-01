import { z } from 'zod';
import { agentAccessOperations } from './agent-access';
import { appOperations } from './app';
import type { OperationTier } from './metadata';
import { pluginOperations } from './plugins';
import { projectOperations } from './projects';
import { readerOperations } from './readers';
import { registryOperations } from './registry';
import { operationJsonSchema } from './schema-json';
import { sessionOperations } from './sessions';

export { AgentAccess } from './agent-access';

export { appOperations, AppOpenResult } from './app';

export {
  OperationExecution,
  OperationRunResponse,
  OperationWaitId,
} from './execution';

export { OperationWorkTarget } from './work';

export { OperationRow, OperationTier } from './metadata';

export { readerOperations } from './readers';

export { sessionOperations } from './sessions';

export { projectOperations } from './projects';

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
  ...agentAccessOperations,
  ...appOperations,
  ...readerOperations,
  ...sessionOperations,
  ...pluginOperations,
  ...registryOperations,
  ...projectOperations,
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
