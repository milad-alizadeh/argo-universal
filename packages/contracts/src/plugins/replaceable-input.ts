import { z } from 'zod';
import {
  AgentMessage,
  ToolCallUpdate,
  UserMessage,
} from '../feed/session-update';
import { toolCallSlotId, messageSlotId } from './wire-slot';

export { toolCallSlotId, messageSlotId, ReplaceableSlotId } from './wire-slot';

export const ReplaceableInput = z.discriminatedUnion('slotId', [
  z.strictObject({
    slotId: z.literal(toolCallSlotId),
    props: z.strictObject({ row: ToolCallUpdate }),
  }),
  z.strictObject({
    slotId: z.literal(messageSlotId),
    props: z.strictObject({ row: z.union([UserMessage, AgentMessage]) }),
  }),
]);

export type ReplaceableInput = z.infer<typeof ReplaceableInput>;

export const RenderAnswer = z.union([
  z.strictObject({ input: ReplaceableInput }),
  z.strictObject({ treePath: z.string().startsWith('render:') }),
  z.strictObject({
    pluginId: z.string(),
    path: z.string().startsWith('render:'),
  }),
]);

export const renderReasonLimit = 1024;

export type RenderAnswer = z.infer<typeof RenderAnswer>;
