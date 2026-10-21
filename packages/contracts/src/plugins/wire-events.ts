import { z } from 'zod';
import { PluginDataState } from '#plugin-argo-calls';
import { ReplaceableSlotId } from '#plugin-replaceable-slot-id';
import { PluginSurface } from '#plugin-surface';
import { WireJson } from '#plugin-wire-json';
import { PluginSlotInput } from '#plugin-wire-slot';

export const PluginViewId = z.string().min(1).brand<'PluginViewId'>();

export type PluginViewId = z.infer<typeof PluginViewId>;

export const PluginDispatchId = z.string().min(1).brand<'PluginDispatchId'>();

export type PluginDispatchId = z.infer<typeof PluginDispatchId>;

export const PluginViewInput = z.object({
  pluginId: z.string(),
  path: z.string(),
  projectId: z.string().min(1).optional(),
});

export type PluginViewInput = z.infer<typeof PluginViewInput>;

// A Part event: the App names the node by key and the handler prop by event name.
export const PartEvent = z.object({
  event: z.string().min(1),
  payload: WireJson.optional(),
});

export type PartEvent = z.infer<typeof PartEvent>;

// The App before it sends and the Server on arrival both check a payload against the part's event schema.
export function partEventPayload(
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
 * What a Part event's schema metadata asks of the App. `value` names the prop the App echoes the payload into
 * at once; `blocks` holds the part disabled while the Plugin answers; `flush` sends pending edits first;
 * `throttleMs` coalesces quick edits.
 */
const PartEventRules = z.object({
  value: z.string().optional(),
  blocks: z.boolean().default(true),
  flush: z.boolean().default(false),
  throttleMs: z.number().default(0),
});

export type PartEventRules = z.output<typeof PartEventRules>;

export function partEventRules(schema: z.ZodType | undefined): PartEventRules {
  return PartEventRules.parse(schema?.meta() ?? {});
}

const target = z.object({
  revision: z.number().int().positive(),
  key: z.string().min(1),
});

export const PluginDispatchInput = PluginViewInput.extend({
  ...target.shape,
  ...PartEvent.shape,
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
    serverDevice: z.boolean().optional(),
    viewId: PluginViewId,
    path: z.string(),
    projectId: z.string().min(1).optional(),
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
    ...PartEvent.shape,
  }),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
