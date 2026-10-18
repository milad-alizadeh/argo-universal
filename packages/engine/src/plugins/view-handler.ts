import {
  WireEvent,
  type PluginDispatchInput,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';

const missingHandler = 'Plugin handler is no longer available';

export function requireViewHandler(
  root: WireNode | null,
  input: PluginDispatchInput,
): void {
  if (!root) throw new Error('Plugin view is no longer available');
  const node = findWireNode(root, input.key);

  if (!node) throw new Error(missingHandler);
  requireEvent(node, input.event);
}

function requireEvent(node: WireNode, event: string): void {
  const handler = WireEvent.safeParse(node.props[event]);

  if (!handler.success) throw new Error(missingHandler);
  requireEventName(handler.data.$event, event);
}

function requireEventName(actual: string, expected: string): void {
  if (actual !== expected) throw new Error(missingHandler);
}
