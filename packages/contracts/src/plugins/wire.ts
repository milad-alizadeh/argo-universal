import { z } from 'zod';

export {
  PluginSlotInput,
  SlotId,
  projectDetailsSlotId,
  slotPath,
} from '#plugin-wire-slot';

// Plugin pages cross the wire as data (ADR-0025): kit component names and props, never code.
export type WireJson =
  | string
  | number
  | boolean
  | null
  | WireJson[]
  | { [key: string]: WireJson };

export const WireJson: z.ZodType<WireJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(WireJson),
    z.record(z.string(), WireJson),
  ]),
);

export interface WireNode {
  type: string;
  key: string;
  props: Record<string, WireJson>;
  children: WireNode[];
  slots: Record<string, WireNode>;
}

export const WireNode: z.ZodType<WireNode> = z.lazy(() =>
  z.strictObject({
    type: z.string().min(1),
    key: z.string(),
    props: z.record(z.string(), WireJson),
    children: z.array(WireNode),
    slots: z.record(z.string(), WireNode),
  }),
);

// Function props name their event; dispatch also identifies the node and revision.
export const WireEvent = z.strictObject({ $event: z.string().min(1) });

export type WireEvent = z.infer<typeof WireEvent>;

// Built-in Actions run in the App without a round trip to the Server.
export const Action = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('toast'), message: z.string() }),
  z.strictObject({ action: z.literal('navigate'), path: z.string() }),
  z.strictObject({ action: z.literal('openUrl'), url: z.string() }),
  z.strictObject({ action: z.literal('copy'), text: z.string() }),
]);

export type Action = z.infer<typeof Action>;

// What a Plugin's handler prop becomes: a Server event, or an Action the App runs itself.
export const Handler = z.union([WireEvent, Action]);

export type Handler = z.infer<typeof Handler>;

// A patch step addresses a node from the root by child index, or by slot name.
export type PatchStep = number | string;

export const PatchStep = z.union([z.number().int().nonnegative(), z.string()]);

export const PatchOp = z.discriminatedUnion('op', [
  z.strictObject({
    op: z.literal('replace'),
    path: z.array(PatchStep),
    node: WireNode,
  }),
  z.strictObject({
    op: z.literal('props'),
    path: z.array(PatchStep),
    props: z.record(z.string(), WireJson),
  }),
]);

export type PatchOp = z.infer<typeof PatchOp>;

export const ViewMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('snapshot'),
    viewId: z.string().optional(),
    revision: z.number().int().nonnegative(),
    root: WireNode,
  }),
  z.strictObject({
    type: z.literal('patch'),
    viewId: z.string().optional(),
    revision: z.number().int().nonnegative(),
    ops: z.array(PatchOp).min(1),
  }),
]);

export type ViewMessage = z.infer<typeof ViewMessage>;

export {
  PluginDispatchInput,
  PluginInteraction,
  PluginDispatchResult,
  PluginViewInput,
  PluginEvent,
} from '#plugin-wire-events';

// A Slot's stream: the Plugins that fill it, in list order, then each one's view as it arrives.
export const SlotMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('contributors'),
    pluginIds: z.array(z.string()),
  }),
  z.strictObject({
    type: z.literal('view'),
    pluginId: z.string(),
    // What `plugins.dispatch` takes as `path` for this contribution's events.
    path: z.string(),
    message: ViewMessage,
  }),
]);

export type SlotMessage = z.infer<typeof SlotMessage>;
