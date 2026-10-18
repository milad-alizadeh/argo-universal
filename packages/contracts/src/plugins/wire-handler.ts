import { propAtPath } from './action-handler-path';
import { WireEvent, WireNode, type WireJson } from './wire';

export interface WireHandler {
  node: WireNode;
  handler: WireEvent;
}

interface Search {
  node: WireNode;
  reference: string;
}

export function findWireHandler(
  node: WireNode,
  path: string[],
): WireHandler | undefined {
  return (
    directHandler(node, path) ??
    search(node.props, { node, reference: JSON.stringify(path) })
  );
}

function directHandler(
  node: WireNode,
  path: string[],
): WireHandler | undefined {
  const parsed = WireEvent.safeParse(propAtPath(node.props, path));

  if (!parsed.success) return undefined;

  return parsed.data.$path ? undefined : { node, handler: parsed.data };
}

function search(value: WireJson, context: Search): WireHandler | undefined {
  const parsed = WireEvent.safeParse(value);

  if (parsed.success) return matched(parsed.data, context);

  return searchObject(value, context);
}

function matched(handler: WireEvent, context: Search): WireHandler | undefined {
  return JSON.stringify(handler.$path) === context.reference
    ? { node: context.node, handler }
    : undefined;
}

function searchObject(
  value: WireJson,
  context: Search,
): WireHandler | undefined {
  if (value === null) return undefined;

  if (typeof value !== 'object') return undefined;
  const next = searchContext(value, context);

  return Object.values(value)
    .map((child) => search(child, next))
    .find((child) => child !== undefined);
}

function searchContext(
  value: WireJson[] | Record<string, WireJson>,
  context: Search,
): Search {
  const parsed = WireNode.safeParse(value);

  return parsed.success ? { ...context, node: parsed.data } : context;
}
