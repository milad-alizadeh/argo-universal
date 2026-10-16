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

function nodeAt(root: WireNode, path: readonly PatchStep[]): WireNode {
  let node = root;

  for (const step of path) {
    const next =
      typeof step === 'number' ? node.children[step] : node.slots[step];

    if (!next) throw new Error(`Patch path leaves the tree at ${step}`);
    node = next;
  }

  return node;
}

function applyOp(root: WireNode, op: PatchOp): WireNode {
  if (op.op === 'props') {
    nodeAt(root, op.path).props = op.props;

    return root;
  }
  const last = op.path.at(-1);

  if (last === undefined) return op.node;
  const parent = nodeAt(root, op.path.slice(0, -1));

  if (typeof last === 'number') parent.children[last] = op.node;
  else parent.slots[last] = op.node;

  return root;
}

// Applies a patch to a snapshot and returns the new root; the input is left untouched.
export function applyPatch(
  root: WireNode,
  ops: readonly PatchOp[],
): WireNode {
  return ops.reduce(applyOp, structuredClone(root));
}
