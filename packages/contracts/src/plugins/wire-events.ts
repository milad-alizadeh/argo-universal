import { z } from 'zod';
import { PluginSlotInput } from '#plugin-wire-slot';

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
  viewId: z.string().min(1),
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
    viewId: z.string(),
    path: z.string(),
    slot: PluginSlotInput.optional(),
  }),
  z.object({ type: z.literal('close'), viewId: z.string() }),
  z
    .object({
      type: z.literal('dispatch'),
      viewId: z.string(),
      requestId: z.string(),
      ...target.shape,
    })
    .and(PluginInteraction),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
