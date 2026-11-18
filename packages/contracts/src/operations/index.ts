import { z } from 'zod';
import type { IconName } from '../kit-symbols';
import { agentAccessOperations } from './agent-access';
import { appOperations } from './app';
import { diagramOperations } from './diagram';
import type { OperationTier } from './metadata';
import { pluginOperations } from './plugins';
import { projectOperations } from './projects';
import { readerOperations } from './readers';
import { registryOperations } from './registry';
import { operationJsonSchema } from './schema-json';
import { sessionOperations } from './sessions';
import { todoListOperations } from './todo-list';
import { voiceOperations } from './voice';

export { AgentAccess } from './agent-access';

export { appOperations, AppOpenResult } from './app';

export {
  OperationExecution,
  OperationRunResponse,
  OperationWaitId,
} from './execution';

export { OperationWorkTarget } from './work';

export {
  discoveryOperation,
  operationFeedRowId,
  OperationRow,
  OperationTier,
} from './metadata';

export { readerOperations } from './readers';

export { sessionOperations } from './sessions';

export { ProjectAdded, projectOperations } from './projects';

export interface OperationDefinition {
  id: string;
  label: string;
  icon: IconName;
  description: string;
  params: z.ZodType;
  result: z.ZodType;
  tier: OperationTier;
  keywords: readonly string[];
}

export const operations = {
  ...agentAccessOperations,
  ...appOperations,
  ...diagramOperations,
  ...readerOperations,
  ...sessionOperations,
  ...todoListOperations,
  ...voiceOperations,
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
