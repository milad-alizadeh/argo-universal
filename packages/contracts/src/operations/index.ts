import { z } from 'zod';
import type { IconName } from '../kit-symbols';
import { agentAccessOperations } from './agent-access';
import { appOperations } from './app';
import { chartOperations } from './chart';
import { conversationOperations } from './conversation';
import { conversationDeviceOperations } from './conversation-devices';
import { conversationSettingsOperations } from './conversation-settings';
import { diagramOperations } from './diagram';
import type { ImageVisibility } from './image-visibility';
import type { OperationTier, OperationPolicy } from './metadata';
import { pluginOperations } from './plugins';
import { projectScheduleOperations } from './project-schedules';
import { projectOperations } from './projects';
import { readerOperations } from './readers';
import { registryOperations } from './registry';
import { runOperations } from './runs';
import { operationJsonSchema } from './schema-json';
import { sessionOperations } from './sessions';
import { terminalOperations } from './terminals';
import { todoListOperations } from './todo-list';
import { voiceOperations } from './voice';

export { AgentAccess } from './agent-access';

export { appOperations, AppOpenResult } from './app';

export {
  AppScreenshotResult,
  ScreenCaptureAnswer,
  ScreenImage,
  ScreenRequester,
  ScreenSightReply,
  ScreenSightStreamEvent,
} from './screen-sight';

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
  OperationPolicy,
  OperationTier,
} from './metadata';

export { readerOperations } from './readers';

export { sessionOperations } from './sessions';

export {
  ProjectSchedule,
  type ProjectScheduleHistoryEntry,
  type ProjectScheduleHistoryPage,
  ProjectScheduleCadence,
  ProjectScheduleInput,
  ProjectScheduleOccurrence,
  ScheduleWeekday,
  projectScheduleOperations,
} from './project-schedules';

export { ProjectAdded, projectOperations } from './projects';

export { runOperations } from './runs';

export { terminalOperations } from './terminals';

export interface OperationDefinition {
  id: string;
  label: string;
  icon: IconName;
  description: string;
  params: z.ZodType;
  result: z.ZodType;
  tier: OperationTier;
  policy: OperationPolicy;
  keywords: readonly string[];
  imageVisibility?: ImageVisibility;
}

export const operations = {
  ...agentAccessOperations,
  ...appOperations,
  ...diagramOperations,
  ...chartOperations,
  ...readerOperations,
  ...sessionOperations,
  ...todoListOperations,
  ...conversationOperations,
  ...conversationSettingsOperations,
  ...conversationDeviceOperations,
  ...voiceOperations,
  ...pluginOperations,
  ...registryOperations,
  ...projectOperations,
  ...projectScheduleOperations,
  ...runOperations,
  ...terminalOperations,
} as const satisfies Record<string, OperationDefinition>;

export const OperationId = z.enum(
  Object.values(operations).map(({ id }) => id),
);

export type OperationId = z.infer<typeof OperationId>;

export type OperationDescription = Omit<
  OperationDefinition,
  'params' | 'result' | 'imageVisibility'
> & {
  params: z.core.JSONSchema.JSONSchema;
  result: z.core.JSONSchema.JSONSchema;
};

export function describeOperation({
  imageVisibility: _imageVisibility,
  ...operation
}: OperationDefinition): OperationDescription {
  return {
    ...operation,
    params: operationJsonSchema(operation.params),
    result: operationJsonSchema(operation.result),
  };
}
