import { isWireContainer } from '@repo/contracts/plugins/prepare-tree';
import type {
  Handler,
  PluginInteraction,
  WireNode,
} from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import type { z } from 'zod';
import { deliverControl } from './plugin-control-state';
import { Unsupported } from './plugin-unsupported';
import type { PluginActions } from './use-plugin-actions';
import type { PluginUi } from './use-plugin-ui';

export type PluginOnEvent = (
  key: string,
  interaction: PluginInteraction,
) => void | Promise<void>;

export interface RenderContext {
  onEvent: PluginOnEvent;
  dispatch: PluginOnEvent;
  key: string;
  ui: PluginUi;
  actions: PluginActions;
  slots: Record<string, React.JSX.Element>;
}

export function handlerOf(
  handler: Handler | undefined,
  context: RenderContext,
  event: 'onPress' | 'onSubmit' = 'onPress',
): (() => void) | undefined {
  if (!handler) return undefined;

  return () => {
    void invokeHandler(handler, context, { event }).catch(() => {});
  };
}

async function invokeHandler(
  handler: Handler,
  context: RenderContext,
  interaction: PluginInteraction,
): Promise<void> {
  await deliverControl(handler, interaction, context);
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

      if (parsed.success) return render(parsed.data, context, children);

      return isWireContainer(node) ? <Unsupported /> : null;
    },
  };
}

export function payloadHandler<Value>(
  handler: Handler | undefined,
  context: RenderContext,
  interaction: (value: Value) => PluginInteraction,
): ((value: Value) => void) | undefined {
  if (!handler) return undefined;

  return (value) => {
    void invokeHandler(handler, context, interaction(value)).catch(() => {});
  };
}

export function valueChangeHandler(
  handler: Handler,
  context: RenderContext,
): (payload: string | boolean | number) => void {
  return (
    payloadHandler(
      handler,
      context,
      (payload: string | boolean | number): PluginInteraction => ({
        event: 'onValueChange',
        payload,
      }),
    ) ?? ((): void => {})
  );
}

export function textChangeHandler(
  handler: Handler,
  context: RenderContext,
): (payload: string) => void {
  return (
    payloadHandler(handler, context, (payload: string): PluginInteraction => ({
      event: 'onChangeText',
      payload,
    })) ?? ((): void => {})
  );
}
