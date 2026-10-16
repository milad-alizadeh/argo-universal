import { z } from 'zod';

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

function childAt(node: WireNode, step: PatchStep): WireNode {
  const next =
    typeof step === 'number' ? node.children[step] : node.slots[step];

  if (!next) throw new Error(`Patch path leaves the tree at ${step}`);

  return next;
}

const change =
  (op: PatchOp) =>
  (node: WireNode): WireNode =>
    op.op === 'props' ? { ...node, props: op.props } : op.node;

// Rebuilds the nodes along `path`, so the tree it was given is never mutated.
function update(
  node: WireNode,
  path: readonly PatchStep[],
  apply: (target: WireNode) => WireNode,
): WireNode {
  const [step, ...rest] = path;

  if (step === undefined) return apply(node);
  const next = update(childAt(node, step), rest, apply);

  return typeof step === 'number'
    ? { ...node, children: node.children.with(step, next) }
    : { ...node, slots: { ...node.slots, [step]: next } };
}

const applyOp = (root: WireNode, op: PatchOp): WireNode =>
  update(root, op.path, change(op));

// Applies a patch to a snapshot and returns the new root; the input is left untouched.
export function applyPatch(root: WireNode, ops: readonly PatchOp[]): WireNode {
  return ops.reduce(applyOp, root);
}

// What the Server asks a running Plugin's pages to do.
export const PluginEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('open'), path: z.string() }),
  z.object({ type: z.literal('close'), path: z.string() }),
  z.object({
    type: z.literal('dispatch'),
    path: z.string(),
    eventId: z.string(),
    payload: WireJson.optional(),
  }),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
