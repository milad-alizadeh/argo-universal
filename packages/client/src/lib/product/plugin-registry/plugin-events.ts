import { Handler, WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { nestedEventProps } from './plugin-nested-events';
import type { ControlInput as Input, PluginProps } from './plugin-rendering';

type Event = {
  name: string;
  schema: z.ZodType;
  handler?: Handler;
  path?: string[];
};

export type Change = (edit: {
  event: string;
  value?: WireJson;
  deliver: () => Promise<void>;
}) => void;

export const localEvents = new Set([
  'onValueChange',
  'onChangeText',
  'onSelectionChange',
]);

export function eventProps(input: Input, change: Change): PluginProps {
  const nested = nestedEventProps(input.node.props, (handler, path) =>
    nestedCallback(input, { handler, path }, change),
  );

  return { ...nested, ...rootEvents(input, change) };
}

function rootEvents(input: Input, change: Change): PluginProps {
  return Object.fromEntries(
    Object.entries(input.part.events).map(([name, schema]) => {
      const handler = Handler.safeParse(input.node.props[name]).data;

      return [name, callback(input, { name, schema, handler }, change)];
    }),
  );
}

function callback(
  input: Input,
  event: Event,
  change: Change,
): ((value?: WireJson) => void) | undefined {
  if (!event.handler && !localEvents.has(event.name)) return undefined;

  return (value) =>
    change({
      event: event.name,
      value,
      deliver: () => deliver(input, event, value),
    });
}

async function deliver(
  { context }: Input,
  event: Event,
  payload?: WireJson,
): Promise<void> {
  const { handler, name, schema } = event;

  if (!handler) return;

  if (!('$event' in handler))
    return context.actions.run(handler, actionTarget(context, event));
  const path = referencePath(handler, event);
  await context.ui.send(context.key, { event: name, payload, schema, path });
}

function actionTarget(
  context: Input['context'],
  event: Event,
): Parameters<Input['context']['actions']['run']>[1] {
  return {
    key: context.key,
    path: event.path ?? [event.name],
    send: context.ui.dispatch,
  };
}

function nestedCallback(
  input: Input,
  nested: { handler: Handler; path: string[] },
  change: Change,
): ReturnType<typeof callback> {
  const name = nested.path.at(-1) ?? '';
  const schema = input.part.events[name];

  if (!schema) return undefined;

  return callback(input, { ...nested, name, schema }, change);
}

function referencePath(
  handler: { $path?: string[] },
  event: Event,
): string[] | undefined {
  return handler.$path ?? event.path;
}
