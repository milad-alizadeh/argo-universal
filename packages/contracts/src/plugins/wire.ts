import { z } from 'zod';
import { WebUrl } from '#plugin-account-calls';
import { PluginViewId } from '#plugin-wire-events';

export {
  AddOnlySlotId,
  addOnlySlots,
  itemsSlotEntry,
  replaceableSlots,
  slotSchemas,
  PluginSlotInput,
  ReplaceableSlotId,
  SessionRowItem,
  SlotId,
  SlotItems,
  SlotItemsInput,
  itemsSlot,
  projectDetailsSlotId,
  sessionRowSlotId,
  slotPath,
  slotRegistry,
  type AnyItemsSlot,
  type ItemsContext,
  type ItemsSlotItem,
  type SlotLimit,
} from '#plugin-wire-slot';

import { WireJson } from '#plugin-wire-json';

export { WireJson } from '#plugin-wire-json';

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

// A handler prop on the wire; the App sends it back as a Part event by node key and event name.
export const WireEvent = z.strictObject({
  $event: z.string().min(1),
});

export type WireEvent = z.infer<typeof WireEvent>;

// Built-in Actions run in the App without a round trip to the Server.
export const Action = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('toast'), message: z.string() }),
  z.strictObject({ action: z.literal('navigate'), path: z.string() }),
  z.strictObject({ action: z.literal('openUrl'), url: WebUrl }),
  z.strictObject({ action: z.literal('copy'), text: z.string() }),
  z.strictObject({
    action: z.literal('share'),
    message: z.string(),
    url: WebUrl.optional(),
    title: z.string().optional(),
  }),
  z.strictObject({ action: z.literal('pop') }),
  // Opens New Session for the Project with `draft` in the Composer; nothing is stored until the person sends it.
  z.strictObject({
    action: z.literal('newSession'),
    projectId: z.string().min(1),
    draft: z.string().min(1),
  }),
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
    viewId: PluginViewId.optional(),
    revision: z.number().int().nonnegative(),
    root: WireNode,
  }),
  z.strictObject({
    type: z.literal('patch'),
    viewId: PluginViewId.optional(),
    revision: z.number().int().nonnegative(),
    ops: z.array(PatchOp).min(1),
  }),
]);

export type ViewMessage = z.infer<typeof ViewMessage>;

export {
  PluginViewId,
  PluginDispatchId,
  PluginDispatchInput,
  PartEvent,
  partEventPayload,
  PluginDispatchResult,
  PluginViewInput,
  PluginEvent,
  partEventRules,
  type PartEventRules,
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

export {
  partEventHandler,
  placedPartEvent,
  WireProps,
} from '#plugin-wire-part-events';
