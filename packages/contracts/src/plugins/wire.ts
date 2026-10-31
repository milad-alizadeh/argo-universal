import { z } from 'zod';
import { PluginViewId } from '#plugin-wire-events';

export {
  AddOnlySlotId,
  addOnlySlots,
  itemsSlotEntry,
  mergedItems,
  replaceableSlots,
  slotSchemas,
  ReplaceableSlotId,
  SessionRowItem,
  SlotId,
  SlotItems,
  SlotItemsInput,
  itemsSlot,
  projectDetailsSlotId,
  sessionActivitySlotId,
  SessionActivityItem,
  sessionBarSlotId,
  sessionRowSlotId,
  slotItemsListLimit,
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

export { Action, Handler, WireEvent } from '#plugin-wire-action';

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
  ComponentEvent,
  componentEventPayload,
  PluginDispatchResult,
  PluginViewInput,
  PluginEvent,
  componentEventRules,
  type ComponentEventRules,
} from '#plugin-wire-events';

export {
  componentEventHandler,
  placedComponentEvent,
  propsWithin,
  WireProps,
} from '#plugin-kit-component-events';
