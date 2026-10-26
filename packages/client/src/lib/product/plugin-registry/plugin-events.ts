import {
  Handler,
  partEventHandler,
  WireJson,
  partEventRules,
  type PartEventRules,
} from '@repo/contracts/plugins/wire';
import type { z } from 'zod';
import { runAction } from '../plugin-actions';
import type {
  ControlInput as Input,
  PluginProps,
  Callback,
} from './plugin-rendering';

type Event = {
  name: string;
  schema: z.ZodType;
  handler?: Handler;
};

export type Edit = {
  rules: PartEventRules;
  value?: WireJson;
  deliver: () => Promise<void>;
};

export type Change = (edit: Edit) => void;

export function eventProps(input: Input, change: Change): PluginProps {
  return Object.fromEntries(
    Object.entries(input.part.events).map(([name, schema]) => {
      const handler = Handler.safeParse(
        partEventHandler(input.node.props, name, schema),
      ).data;

      return [name, callback(input, { name, schema, handler }, change)];
    }),
  );
}

function callback(
  input: Input,
  event: Event,
  change: Change,
): Callback | undefined {
  const rules = partEventRules(event.schema);

  if (!event.handler && !ownsEcho(input, rules)) return undefined;

  return eventCallback(input, event, change);
}

function ownsEcho(input: Input, rules: PartEventRules): boolean {
  if (!rules.value) return false;

  return rules.within === undefined
    ? true
    : input.node.props[rules.within] !== undefined;
}

function eventCallback(input: Input, event: Event, change: Change): Callback {
  const rules = partEventRules(event.schema);

  // List owns its loading state and reports a rejected page or refresh once.
  if (rules.awaits) return (value) => deliver(input, event, value);

  return (value) =>
    change({ rules, value, deliver: () => deliver(input, event, value) });
}

async function deliver(
  { context }: Input,
  event: Event,
  payload?: WireJson,
): Promise<void> {
  const { handler, name, schema } = event;

  if (!handler) return;

  if (!('$event' in handler)) return runAction(handler, context.openPage);
  await context.send(context.key, { event: name, payload, schema });
}
