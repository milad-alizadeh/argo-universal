import {
  Handler,
  partEventHandler,
  partEventRules,
  propsWithin,
  type PartEventRules,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import type { z } from 'zod';
import { runAction } from '../plugin-actions';
import type { ControlField } from './plugin-control-field';
import type { PluginDispatcher } from './plugin-dispatcher';
import type { Callback, ControlInput, PluginProps } from './plugin-rendering';

// One node's events: the node, its field, the tree's dispatcher, and the redraw a field's change asks for.
export type NodeEvents = {
  input: ControlInput;
  field: ControlField;
  send: PluginDispatcher['send'];
  update: () => void;
};

type Declared = {
  name: string;
  schema: z.ZodType;
  rules: PartEventRules;
  handler?: Handler;
};

// A prop a Part event places: on the node itself, or inside the prop object its schema's `within` names.
type Placed = { within?: string; name: string; value: PluginProps[string] };

// The kit component's props: the node's own, each Part event's callback, the echoed value, focus and pending state.
export function partEventProps(node: NodeEvents): PluginProps {
  const placed = [...callbacks(node), ...echoed(node)];

  return {
    ...placedProps(node.input, placed),
    ...node.field.focusProps(node.update),
    ...pendingProps(node.field),
  };
}

const declared = ({ node, part }: ControlInput): Declared[] =>
  Object.entries(part.events).map(([name, schema]) => ({
    name,
    schema,
    rules: partEventRules(schema),
    handler: Handler.safeParse(partEventHandler(node.props, name, schema)).data,
  }));

// A missing callback still replaces whatever the node holds at the event's name.
const callbacks = (node: NodeEvents): Placed[] =>
  declared(node.input).map((event) => {
    const value = callback(node, event);
    const within = value === undefined ? undefined : event.rules.within;

    return { within, name: event.name, value };
  });

function callback(node: NodeEvents, event: Declared): Callback | undefined {
  if (!handled(node.input, event)) return undefined;

  // List owns its loading state and reports a rejected page or refresh once.
  if (event.rules.awaits) return (value) => deliver(node, event, value);

  const change = node.field.changeFor(node.update);

  return (value) =>
    change({
      rules: event.rules,
      value,
      deliver: () => deliver(node, event, value),
    });
}

const handled = (input: ControlInput, event: Declared): boolean =>
  event.handler !== undefined || ownsEcho(input, event.rules);

function ownsEcho(input: ControlInput, rules: PartEventRules): boolean {
  if (!rules.value) return false;

  return holds(input, rules.within);
}

// The App echoes a value only into a prop object the node has.
const holds = ({ node }: ControlInput, within?: string): boolean =>
  within === undefined || node.props[within] !== undefined;

function echoed({ input, field }: NodeEvents): Placed[] {
  const { value: name, within } = field.rules;

  if (name === undefined || !holds(input, within)) return [];

  return [{ within, name, value: field.current }];
}

async function deliver(
  { input, send }: NodeEvents,
  event: Declared,
  payload?: WireJson,
): Promise<void> {
  const { handler, name, schema } = event;

  if (!handler) return;

  if (!('$event' in handler)) return runAction(handler, input.context.openPage);
  await send(input.context.key, { event: name, payload, schema });
}

const valuesAt = (placed: readonly Placed[], within?: string): PluginProps =>
  Object.fromEntries(
    placed.flatMap((entry) =>
      entry.within === within ? [[entry.name, entry.value]] : [],
    ),
  );

function placedProps(
  { node }: ControlInput,
  placed: readonly Placed[],
): PluginProps {
  const holders = new Set(placed.flatMap(({ within }) => within ?? []));

  const inside = [...holders].map((within) => [
    within,
    { ...propsWithin(node.props, within), ...valuesAt(placed, within) },
  ]);

  return { ...node.props, ...valuesAt(placed), ...Object.fromEntries(inside) };
}

function pendingProps(field: ControlField): PluginProps {
  return field.blocked ? { disabled: true, loading: true } : {};
}
