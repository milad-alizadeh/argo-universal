import { z } from 'zod';
import {
  PluginOperationCaller,
  PluginOperationName,
  PluginOperationParams,
} from '#plugin-operations';
import { PageAddress } from '#plugin-page-address';
import { PluginSurface } from '#plugin-surface';
import { WireJson } from '#plugin-wire-json';
import { SlotItemsInput } from '#plugin-wire-slot';

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

export const PluginEvent = z.union([
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
  /*
   * One draw of a Loader page at its address, with `pages` of its paged list (ADR-0050), for the
   * Connection that asked; it answers by `id`. A background pass's draw is `loadOnly`:
   * the Loader runs, no list is read and nothing renders. A `live` draw keeps a live page's Loader
   * yielding and sends each tree it renders as a frame, until it ends or Argo stops it.
   */
  PageAddress.omit({ pluginId: true }).extend({
    type: z.literal('draw'),
    id: z.number().int().nonnegative(),
    pages: z.number().int().positive(),
    serverDevice: z.boolean().optional(),
    surface: PluginSurface.optional(),
    loadOnly: z.literal(true).optional(),
    live: z.literal(true).optional(),
  }),
  // The App left a live page, so its Loader stops yielding; the draw `id` answers once it has.
  z.object({ type: z.literal('stop'), id: z.number().int().nonnegative() }),
  /*
   * One named read Argo keeps a Query for, run by the Plugin with its args for the Query's Project; it
   * answers by `id`. A page of a paged list (`argo:list`) is read for the draw `draw` names.
   */
  z.object({
    type: z.literal('read'),
    id: z.number().int().nonnegative(),
    name: z.string().min(1),
    args: WireJson,
    projectId: z.string().min(1).optional(),
    draw: z.number().int().nonnegative().optional(),
  }),
  // One batched call to a Plugin's items Slot provider; it answers by `id`.
  z.object({
    type: z.literal('slotItems'),
    id: z.number(),
    input: SlotItemsInput,
  }),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
