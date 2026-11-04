import { z } from 'zod';
import {
  AgentMessage,
  ToolCallUpdate,
  UserMessage,
} from '../feed/session-update';
import { WireJson } from './wire-json';
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

/*
 * What a `ui.render` chain answers: core's own drawing with the props it was passed, the Plugin tree a
 * Hook's pure render drew, or, once the Server names whose Hook drew it, that tree and its Plugin.
 */
export const RenderAnswer = z.union([
  z.strictObject({ input: ReplaceableInput }),
  z.strictObject({ tree: WireJson }),
  z.strictObject({ pluginId: z.string(), tree: WireJson }),
]);

export const renderReasonLimit = 1024;

export type RenderAnswer = z.infer<typeof RenderAnswer>;
