import { kitComponent } from '@repo/contracts/plugins/kit';
import type { PageEvent } from '@repo/contracts/plugins/page-calls';
import {
  Handler,
  componentEventPayload,
  type WireJson,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import { z } from 'zod';

export type FoundNode = NonNullable<ReturnType<typeof findWireNodeEntry>>;

// A node by the text it reads, or by a test of its own.
export type NodeMatch = string | ((node: WireNode) => boolean);

// The props a node's text is read from.
const textProps = [
  'label',
  'title',
  'subtitle',
  'description',
  'text',
  'children',
  'accessibilityLabel',
];

const describeMatch = (match: NodeMatch): string =>
  typeof match === 'string' ? JSON.stringify(match) : 'the node test';

export const findByText = (
  tree: WireNode,
  text: string,
): FoundNode | undefined =>
  findWireNodeEntry(tree, (node) =>
    textProps.some((prop) => node.props[prop] === text),
  );

// The node `match` names in the tree, with its key; none throws.
export function findEntry(tree: WireNode, match: NodeMatch): FoundNode {
  const entry =
    typeof match === 'string'
      ? findByText(tree, match)
      : findWireNodeEntry(tree, match);

  if (!entry)
    throw new Error(
      `No node matches ${describeMatch(match)}. A text matches a node's ${textProps.join(', ')} exactly; pass a function, such as (node) => node.props.finished === true, to test any prop.`,
    );

  return entry;
}

// The node `match` names in the tree; none throws.
export const findNode = (tree: WireNode, match: NodeMatch): WireNode =>
  findEntry(tree, match).node;

const isRecord = (value: WireJson): value is Record<string, WireJson> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The handler a node holds for `event`, on itself or in one of its prop objects, as a List's `onLoadMore` sits in its `pagination`.
export function handlerOf(node: WireNode, event: string): Handler | undefined {
  const within = Object.values(node.props).flatMap((prop) =>
    isRecord(prop) && event in prop ? [prop[event]] : [],
  );

  return Handler.safeParse(node.props[event] ?? within[0]).data;
}

type Reported = { key: string; name: string; value?: WireJson };

/*
 * The event as the node's kit component reports it, its payload checked as the App checks it; an event whose
 * schema takes no payload, as a press, reports none.
 */
export function pageEventOf(
  node: WireNode,
  { key, name, value }: Reported,
): PageEvent {
  const schema = reportedSchema(node.type, name);
  const sent = schema instanceof z.ZodUndefined ? undefined : value;

  return { key, name, schema, payload: componentEventPayload(schema, sent) };
}

function reportedSchema(type: string, name: string): PageEvent['schema'] {
  const schema = kitComponent(type)?.events[name];

  if (!schema) throw new Error(`${type} reports no ${name}`);

  return schema;
}
