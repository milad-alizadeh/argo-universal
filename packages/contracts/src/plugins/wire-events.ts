import { z } from 'zod';
import { PluginDataState } from '#plugin-argo-calls';
import {
  PluginOperationCaller,
  PluginOperationName,
  PluginOperationParams,
} from '#plugin-operations';
import { PluginSurface } from '#plugin-surface';
import { WireJson } from '#plugin-wire-json';
import {
  PluginSlotInput,
  ReplaceableSlotId,
  SlotItemsInput,
} from '#plugin-wire-slot';

export const PluginViewId = z.string().min(1).brand<'PluginViewId'>();

export type PluginViewId = z.infer<typeof PluginViewId>;

export const PluginDispatchId = z.string().min(1).brand<'PluginDispatchId'>();

export type PluginDispatchId = z.infer<typeof PluginDispatchId>;

export const PluginViewInput = z.object({
  pluginId: z.string(),
  path: z.string(),
  projectId: z.string().min(1).optional(),
  // The Session a page opens for, such as from a Session header action; the page reads it from its context.
  sessionId: z.string().min(1).optional(),
});

export type PluginViewInput = z.infer<typeof PluginViewInput>;

// A Component event: the App names the node by key and the handler prop by event name.
export const ComponentEvent = z.object({
  event: z.string().min(1),
  payload: WireJson.optional(),
});

export type ComponentEvent = z.infer<typeof ComponentEvent>;

// The App before it sends and the Server on arrival both check a payload against the kit component's event schema.
export function componentEventPayload(
  schema: z.ZodType | undefined,
  payload?: WireJson,
): WireJson | undefined {
  const checked = (schema ?? z.never())
    .pipe(WireJson.optional())
    .safeParse(payload);

  if (!checked.success) throw new Error('Invalid Plugin event payload');

  return checked.data;
}

/*
 * What a Component event's schema metadata asks of the App. `value` names the prop the App echoes the payload into
 * at once; `blocks` holds the kit component disabled while the Plugin answers; `flush` sends pending edits first;
 * `throttleMs` coalesces quick edits. `within` names the prop object that holds the event's handler, as a Picker's
 * `footerAction` holds `onPress`. `awaits` returns the dispatch acknowledgement to a kit component that owns its loading state.
 */
const ComponentEventRules = z.object({
  value: z.string().optional(),
  within: z.string().optional(),
  awaits: z.boolean().optional(),
  blocks: z.boolean().default(true),
  flush: z.boolean().default(false),
  throttleMs: z.number().default(0),
});

export type ComponentEventRules = z.output<typeof ComponentEventRules>;

export function componentEventRules(
  schema: z.ZodType | undefined,
): ComponentEventRules {
  return ComponentEventRules.parse(schema?.meta() ?? {});
}

const target = z.object({
  revision: z.number().int().positive(),
  key: z.string().min(1),
});

export const PluginDispatchInput = PluginViewInput.extend({
  ...target.shape,
  ...ComponentEvent.shape,
  viewId: PluginViewId,
});

export type PluginDispatchInput = z.infer<typeof PluginDispatchInput>;

export const PluginDispatchResult = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({ ok: z.literal(false), error: z.string() }),
]);

export type PluginDispatchResult = z.infer<typeof PluginDispatchResult>;

export const PluginEvent = z.union([
  z.object({
    type: z.literal('data'),
    viewId: PluginViewId,
    watchId: z.string(),
    state: PluginDataState,
  }),
  z.object({
    type: z.literal('open'),
    background: z.boolean().optional(),
    serverDevice: z.boolean().optional(),
    viewId: PluginViewId,
    path: z.string(),
    projectId: z.string().min(1).optional(),
    sessionId: z.string().min(1).optional(),
    slot: PluginSlotInput.optional(),
    renderSlot: ReplaceableSlotId.optional(),
    surface: PluginSurface.optional(),
  }),
  z.object({ type: z.literal('close'), viewId: PluginViewId }),
  z.object({
    type: z.literal('discardRender'),
    path: z.string().startsWith('render:'),
  }),
  z.object({
    type: z.literal('dispatch'),
    viewId: PluginViewId,
    requestId: PluginDispatchId,
    ...target.shape,
    ...ComponentEvent.shape,
  }),
  /*
   * One of the Plugin's own Operations, run by an Agent or the user through `argo run`; it answers by
   * `id` with the handler's result, or with why it failed.
   */
  z.object({
    type: z.literal('operation'),
    id: z.number().int().nonnegative(),
    name: PluginOperationName,
    params: PluginOperationParams,
    caller: PluginOperationCaller,
  }),
  // One batched call to a Plugin's items Slot provider; it answers by `id`.
  z.object({
    type: z.literal('slotItems'),
    id: z.number(),
    input: SlotItemsInput,
  }),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
