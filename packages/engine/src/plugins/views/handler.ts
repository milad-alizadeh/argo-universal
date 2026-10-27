import { kitComponent } from '@repo/contracts/plugins/kit';
import {
  componentEventHandler,
  componentEventPayload,
  WireEvent,
  type PluginDispatchInput,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';
import type { z } from 'zod';

const missingHandler = 'Plugin handler is no longer available';

// A Component event names its node by key and its handler prop by event name.
export function requireViewHandler(
  root: WireNode | null,
  input: PluginDispatchInput,
): void {
  const node = requireNode(root, input.key);

  const schema = eventSchema(node.type, input.event);

  if (!hasHandler(node, input.event, schema)) throw new Error(missingHandler);
  componentEventPayload(schema, input.payload);
}

function eventSchema(type: string, event: string): z.ZodType | undefined {
  const events = componentEvents(type);

  return Object.hasOwn(events, event) ? events[event] : undefined;
}

const componentEvents = (type: string): Record<string, z.ZodType> =>
  kitComponent(type)?.events ?? {};

function requireNode(root: WireNode | null, key: string): WireNode {
  if (!root) throw new Error('Plugin view is no longer available');
  const node = findWireNode(root, key);

  if (!node) throw new Error(missingHandler);

  return node;
}

const hasHandler = (
  node: WireNode,
  event: string,
  schema: z.ZodType | undefined,
): boolean =>
  WireEvent.safeParse(componentEventHandler(node.props, event, schema)).data
    ?.$event === event;
