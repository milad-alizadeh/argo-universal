import { wirePart } from '@repo/contracts/plugins/kit';
import {
  partEventPayload,
  WireEvent,
  type PluginDispatchInput,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';

const missingHandler = 'Plugin handler is no longer available';

// A Part event names its node by key and its handler prop by event name.
export function requireViewHandler(
  root: WireNode | null,
  input: PluginDispatchInput,
): void {
  const node = requireNode(root, input.key);

  if (!hasHandler(node, input.event)) throw new Error(missingHandler);
  partEventPayload(wirePart(node.type)?.events[input.event], input.payload);
}

function requireNode(root: WireNode | null, key: string): WireNode {
  if (!root) throw new Error('Plugin view is no longer available');
  const node = findWireNode(root, key);

  if (!node) throw new Error(missingHandler);

  return node;
}

const hasHandler = (node: WireNode, event: string): boolean =>
  WireEvent.safeParse(node.props[event]).data?.$event === event;
