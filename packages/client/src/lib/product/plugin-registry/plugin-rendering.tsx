import type {
  Handler,
  PluginInteraction,
  WireNode,
} from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import type { z } from 'zod';
import { runAction } from './plugin-registry-actions';
import type { PluginUi } from './use-plugin-ui';

export type PluginOnEvent = (
  key: string,
  interaction: PluginInteraction,
) => void | Promise<void>;

export interface RenderContext {
  onEvent: PluginOnEvent;
  key: string;
  ui: PluginUi;
  slots: Record<string, React.JSX.Element>;
}

export function handlerOf(
  handler: Handler | undefined,
  { onEvent, key }: RenderContext,
): (() => void) | undefined {
  if (!handler) return undefined;

  return () => {
    if ('$event' in handler)
      void Promise.resolve(onEvent(key, { event: 'onPress' })).catch(() => {});
    else void runAction(handler);
  };
}

export interface Entry {
  render: (
    node: WireNode,
    context: RenderContext,
    children: React.ReactNode,
  ) => React.JSX.Element | null;
}

type RenderEntry<Schema extends z.ZodType> = (
  props: z.output<Schema>,
  context: RenderContext,
  children: React.ReactNode,
) => React.JSX.Element;

export function entry<Schema extends z.ZodType>(
  schema: Schema,
  render: RenderEntry<Schema>,
): Entry {
  return {
    render: (node, context, children) => {
      const parsed = schema.safeParse(node.props);

      return parsed.success ? render(parsed.data, context, children) : null;
    },
  };
}
