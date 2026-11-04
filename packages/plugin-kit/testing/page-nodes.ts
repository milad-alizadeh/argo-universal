import {
  Handler,
  type Action,
  type PageCall,
  type WireJson,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';

export type FoundNode = NonNullable<ReturnType<typeof findWireNodeEntry>>;

// A node by the text it reads, or by a test of its own.
export type NodeMatch = string | ((node: WireNode) => boolean);

// The props a node's text is read from.
const textProps = ['label', 'title', 'text', 'children', 'accessibilityLabel'];

const describeMatch = (match: NodeMatch): string =>
  typeof match === 'string' ? JSON.stringify(match) : 'the node test';

export const findByText = (
  tree: WireNode,
  text: string,
): FoundNode | undefined =>
  findWireNodeEntry(tree, (node) =>
    textProps.some((prop) => node.props[prop] === text),
  );

// The node `match` names in the tree; none throws.
export function findNode(tree: WireNode, match: NodeMatch): WireNode {
  const entry =
    typeof match === 'string'
      ? findByText(tree, match)
      : findWireNodeEntry(tree, match);

  if (!entry) throw new Error(`No node matches ${describeMatch(match)}`);

  return entry.node;
}

const isRecord = (value: WireJson): value is Record<string, WireJson> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The handler a node holds for `event`, on itself or in one of its prop objects, as a List's `onLoadMore` sits in its `pagination`.
export function handlerOf(node: WireNode, event: string): Handler | undefined {
  const within = Object.values(node.props).flatMap((prop) =>
    isRecord(prop) && event in prop ? [prop[event]] : [],
  );

  return Handler.safeParse(node.props[event] ?? within[0]).data;
}

// The handler `event` holds on the node `match` names; a node without one, or one only a mounted view acts on, throws.
export function pageHandler(
  tree: WireNode,
  match: NodeMatch,
  event: string,
): Action | PageCall {
  const handler = handlerOf(findNode(tree, match), event);
  const named = describeMatch(match);

  if (!handler) throw new Error(`${named} has no ${event}`);

  if ('$event' in handler)
    throw new Error(`${named} sends ${event} to a mounted view`);

  return handler;
}
