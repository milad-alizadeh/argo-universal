import { z } from 'zod';
import { ReplaceableSlotId } from '#plugin-replaceable-slot-id';
import { PluginSurface } from '#plugin-surface';
import { PluginSlotInput } from '#plugin-wire-slot';

export const PluginViewId = z.string().min(1).brand<'PluginViewId'>();

export type PluginViewId = z.infer<typeof PluginViewId>;

export const PluginDispatchId = z.string().min(1).brand<'PluginDispatchId'>();

export type PluginDispatchId = z.infer<typeof PluginDispatchId>;

export const PluginViewInput = z.object({
  pluginId: z.string(),
  path: z.string(),
});

export const PluginInteraction = z.discriminatedUnion('event', [
  z.object({ event: z.literal('onPress'), payload: z.undefined().optional() }),
  z.object({
    event: z.literal('onLongPress'),
    payload: z.undefined().optional(),
  }),
  z.object({ event: z.literal('onChangeText'), payload: z.string() }),
  z.object({ event: z.literal('onSearchTextChange'), payload: z.string() }),
  z.object({
    event: z.literal('onSelectionChange'),
    payload: z.array(z.string()),
  }),
]);

export type PluginInteraction = z.infer<typeof PluginInteraction>;

const target = z.object({
  revision: z.number().int().positive(),
  key: z.string().min(1),
});

export const PluginDispatchInput = PluginViewInput.extend({
  ...target.shape,
  viewId: PluginViewId,
}).and(PluginInteraction);

export type PluginDispatchInput = z.infer<typeof PluginDispatchInput>;

export const PluginDispatchResult = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({ ok: z.literal(false), error: z.string() }),
]);

export type PluginDispatchResult = z.infer<typeof PluginDispatchResult>;

export const PluginEvent = z.union([
  z.object({
    type: z.literal('open'),
    viewId: PluginViewId,
    path: z.string(),
    slot: PluginSlotInput.optional(),
    renderSlot: ReplaceableSlotId.optional(),
    surface: PluginSurface.optional(),
  }),
  z.object({ type: z.literal('close'), viewId: PluginViewId }),
  z
    .object({
      type: z.literal('dispatch'),
      viewId: PluginViewId,
      requestId: PluginDispatchId,
      ...target.shape,
    })
    .and(PluginInteraction),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
