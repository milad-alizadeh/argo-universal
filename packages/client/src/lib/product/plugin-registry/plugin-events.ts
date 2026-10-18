import { Handler, WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import type {
  ControlInput as Input,
  PluginProps,
  ActionProps,
} from './plugin-rendering';

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
  const props: PluginProps = Object.fromEntries(
    Object.entries(input.part.events).map(([name, schema]) => {
      const handler = Handler.safeParse(input.node.props[name]).data;

      return [name, callback(input, { name, schema, handler }, change)];
    }),
  );

  if (input.node.type === 'SplitButton')
    props.actions = splitActions(input, change);

  return props;
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

// SplitButton.actions[].onPress is kit data (Plugin controls / UseSplitButton).
function splitActions(input: Input, change: Change): ActionProps[] | undefined {
  const actions = input.node.props.actions;

  if (!Array.isArray(actions)) return undefined;

  return actions.map((action, index) => {
    const props = z.record(z.string(), WireJson).parse(action);

    const event = {
      name: 'onPress',
      schema: z.undefined(),
      handler: Handler.safeParse(props.onPress).data,
      path: ['actions', String(index), 'onPress'],
    };

    return { ...props, onPress: callback(input, event, change) };
  });
}

function referencePath(
  handler: { $path?: string[] },
  event: Event,
): string[] | undefined {
  return handler.$path ?? event.path;
}
