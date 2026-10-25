import {
  Handler,
  partEventHandler,
  WireJson,
  partEventRules,
  type PartEventRules,
} from '@repo/contracts/plugins/wire';
import type { z } from 'zod';
import { runAction } from '../plugin-actions';
import type { ControlInput as Input, PluginProps } from './plugin-rendering';

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
): ((value?: WireJson) => void) | undefined {
  const rules = partEventRules(event.schema);

  if (!event.handler && !rules.value) return undefined;

  return (value) =>
    change({
      rules,
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

  if (!('$event' in handler)) return runAction(handler);
  await context.send(context.key, { event: name, payload, schema });
}
