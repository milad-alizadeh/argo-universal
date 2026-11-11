import { madePageCall } from '@repo/contracts/plugins/page-call-payload';
import {
  Handler,
  componentEventHandler,
  componentEventPayload,
  componentEventRules,
  propsWithin,
  type ComponentEventRules,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import { errorToast } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { z } from 'zod';
import { runAction } from '../plugin-actions';
import type { ControlField } from './plugin-control-field';
import type {
  Callback,
  ControlInput,
  OnPageCall,
  PluginProps,
} from './plugin-rendering';

// One node's events: the node, its field, and the redraw a field's change asks for.
export type NodeEvents = {
  input: ControlInput;
  field: ControlField;
  update: () => void;
};

type Declared = {
  name: string;
  schema: z.ZodType;
  rules: ComponentEventRules;
  handler?: Handler;
};

// A prop a Component event places: on the node itself, or inside the prop object its schema's `within` names.
type Placed = { within?: string; name: string; value: PluginProps[string] };

// The kit component's props: the node's own, each Component event's callback, the echoed value, focus and pending state.
export function componentEventProps(node: NodeEvents): PluginProps {
  const placed = [...placeCallbacks(node), ...placeEcho(node)];

  return {
    ...placedProps(node.input, placed),
    ...node.field.focusProps(node.update),
    ...pendingProps(node.field),
  };
}

const declareEvents = ({ node, definition }: ControlInput): Declared[] =>
  Object.entries(definition.events).map(([name, schema]) => ({
    name,
    schema,
    rules: componentEventRules(schema),
    handler: Handler.safeParse(componentEventHandler(node.props, name, schema))
      .data,
  }));

// A missing callback still replaces whatever the node holds at the event's name.
const placeCallbacks = (node: NodeEvents): Placed[] =>
  declareEvents(node.input).map((event) => {
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

function ownsEcho(input: ControlInput, rules: ComponentEventRules): boolean {
  if (!rules.value) return false;

  return holds(input, rules.within);
}

// The App echoes a value only into a prop object the node has.
const holds = ({ node }: ControlInput, within?: string): boolean =>
  within === undefined || node.props[within] !== undefined;

function placeEcho({ input, field }: NodeEvents): Placed[] {
  const { value: name, within } = field.rules;

  if (name === undefined || !holds(input, within)) return [];

  return [{ within, name, value: field.current }];
}

// An awaited event's kit component reports its own failure; the field of any other only rolls back, so it is said here.
function deliver(
  { input }: NodeEvents,
  event: Declared,
  payload?: WireJson,
): Promise<void> {
  const run = runInApp(input, event, payload);

  return event.rules.awaits ? run : run.catch(sayWhy);
}

// A call that fails in the App, as a payload that does not fit where it lands, says why.
function sayWhy(error: Error): never {
  const toast = errorToast('That did not work', error);

  if (toast) showToast({ ...toast, tone: 'danger' });

  throw error;
}

/*
 * A built-in Action, or a Loader page's call with the event's payload filled in: nothing goes to the Plugin. With no
 * handler, as a Loader page's search or selection that is not Page state, the kit component's own state is all there
 * is.
 */
async function runInApp(
  input: ControlInput,
  { handler, name, schema }: Declared,
  payload?: WireJson,
): Promise<void> {
  if (!handler) return;

  if ('action' in handler) return runAction(handler, input.context.openPage);

  const checked = componentEventPayload(schema, sent(schema, payload));
  const from = { key: input.context.key, name, schema, payload: checked };

  return pageCallOf(input)(madePageCall(handler, checked), from);
}

// A press reports a native event object; its call carries no payload.
const sent = (schema: z.ZodType, payload?: WireJson): WireJson | undefined =>
  schema instanceof z.ZodUndefined ? undefined : payload;

// Only a Loader page's tree carries Page calls; any other tree's would be a Plugin bug, refused as one.
export const pageCallRefused: OnPageCall = () =>
  Promise.reject(new Error('This page cannot change its Page state'));

const pageCallOf = ({ context }: ControlInput): OnPageCall =>
  context.pageCall ?? pageCallRefused;

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
