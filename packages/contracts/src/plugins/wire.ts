import { z } from 'zod';

// A Slot id is versioned, so a later context shape gets a new id instead of breaking Plugins (Grafana's extension points).
export const projectDetailsSlotId = 'argo/project/details/v1';

// Each Slot id names the one context shape core passes to it.
export const PluginSlotInput = z.discriminatedUnion('slotId', [
  z.strictObject({
    slotId: z.literal(projectDetailsSlotId),
    context: z.strictObject({ projectId: z.string().min(1) }),
  }),
]);

export type PluginSlotInput = z.infer<typeof PluginSlotInput>;

export const SlotId = z.enum([projectDetailsSlotId]);

export type SlotId = z.infer<typeof SlotId>;

// Where a Slot's contribution lives inside its Plugin; page paths start with `/`, so the two never meet.
export function slotPath({ slotId, context }: PluginSlotInput): string {
  return `slot:${slotId}:${JSON.stringify(context)}`;
}

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
  slots: Record<string, WireNode[]>;
}

export const WireNode: z.ZodType<WireNode> = z.lazy(() =>
  z.strictObject({
    type: z.string().min(1),
    key: z.string(),
    props: z.record(z.string(), WireJson),
    children: z.array(WireNode),
    slots: z.record(z.string(), z.array(WireNode)),
  }),
);

// A function prop crosses as an event id; the App sends it back to `plugins.dispatch`.
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

// Keys are local to their sibling collection; slot steps keep identically named children distinct.
export const PatchStep = z.union([
  z.string(),
  z.strictObject({ slot: z.string(), key: z.string() }),
]);

export type PatchStep = z.infer<typeof PatchStep>;

const address = z.array(PatchStep);

export const PatchOp = z.discriminatedUnion('op', [
  z.strictObject({
    op: z.literal('insert'),
    parent: address,
    slot: z.string().optional(),
    index: z.number().int().nonnegative(),
    node: WireNode,
  }),
  z.strictObject({ op: z.literal('remove'), key: address }),
  z.strictObject({
    op: z.literal('move'),
    key: address,
    parent: address,
    slot: z.string().optional(),
    index: z.number().int().nonnegative(),
  }),
  z.strictObject({
    op: z.literal('setProps'),
    key: address,
    props: z.record(z.string(), WireJson),
    unset: z.array(z.string()).optional(),
  }),
  z.strictObject({ op: z.literal('replace'), key: address, node: WireNode }),
]);

export type PatchOp = z.infer<typeof PatchOp>;

export const ViewMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('snapshot'),
    revision: z.number().int().nonnegative(),
    root: WireNode,
  }),
  z.strictObject({
    type: z.literal('patch'),
    revision: z.number().int().nonnegative(),
    ops: z.array(PatchOp).min(1),
  }),
]);

export type ViewMessage = z.infer<typeof ViewMessage>;

export const PluginViewInput = z.object({
  pluginId: z.string(),
  path: z.string(),
});

export const PluginDispatchInput = PluginViewInput.extend({
  eventId: z.string().min(1),
  payload: WireJson.optional(),
});

export type PluginDispatchInput = z.infer<typeof PluginDispatchInput>;

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

// What the Server asks a running Plugin's pages to do.
export const PluginEvent = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('open'),
    path: z.string(),
    // Given when the view is a Slot contribution rather than a page.
    slot: PluginSlotInput.optional(),
  }),
  z.object({ type: z.literal('close'), path: z.string() }),
  z.object({
    type: z.literal('dispatch'),
    path: z.string(),
    eventId: z.string(),
    payload: WireJson.optional(),
  }),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
