import {
  WireEvent,
  type PluginDispatchInput,
  type WireNode,
} from '@repo/contracts/plugins/wire';

const missingHandler = 'Plugin handler is no longer available';

function findNode(root: WireNode, key: string): WireNode | undefined {
  if (root.key === key) return root;

  return [...root.children, ...Object.values(root.slots)]
    .map((child) => findNode(child, key))
    .find((node) => node !== undefined);
}

export function requireViewHandler(
  root: WireNode | null,
  input: PluginDispatchInput,
): void {
  if (!root) throw new Error('Plugin view is no longer available');
  const node = findNode(root, input.key);

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
