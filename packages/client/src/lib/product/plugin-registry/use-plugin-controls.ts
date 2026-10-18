import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';
import { useEffect, useReducer, useState } from 'react';
import { throttle } from '../plugin-dispatcher';
import { eventProps, localEvents, type Change } from './plugin-events';
import type {
  ControlInput,
  PluginProps,
  PluginControls,
} from './plugin-rendering';

type Field = {
  value?: WireJson;
  source?: WireJson;
  type: string;
  focused: boolean;
  pending: number;
  event: string;
};

export function usePluginControls(root: WireNode): PluginControls {
  const [fields] = useState(() => new Map<string, Field>());
  const [, update] = useReducer((revision: number) => revision + 1, 0);
  useEffect(() => {
    for (const key of fields.keys())
      if (!findWireNode(root, key)) fields.delete(key);
  }, [fields, root]);

  return (input) => {
    const field = fieldFor(fields, input);

    return propsFor(input, field, update);
  };
}

function fieldFor(fields: Map<string, Field>, input: ControlInput): Field {
  const { node, context } = input;
  const source = input.source.value ?? input.source.selection;
  const existing = fields.get(context.key);
  const field = matchingField(existing, node.type, source);
  syncField(field, source);
  fields.set(context.key, field);

  return field;
}

function matchingField(
  field: Field | undefined,
  type: string,
  source?: WireJson,
): Field {
  if (field?.type === type) return field;

  return { type, value: source, source, focused: false, pending: 0, event: '' };
}

function syncField(field: Field, source?: WireJson): void {
  if (field.focused) return;

  if (!Object.is(field.source, source))
    field.value = pendingValue(field, source);
  field.source = source;
}

function propsFor(
  input: ControlInput,
  field: Field,
  update: () => void,
): PluginProps {
  const change = changeFor(field, update);
  const props = { ...input.node.props, ...eventProps(input, change) };

  const prop = localProp(input);

  if (prop) props[prop] = field.value;

  if (isPending(input, field))
    Object.assign(props, { disabled: true, loading: true });

  const text = Boolean(input.part.events.onChangeText);

  return Object.assign(props, focusOf(field, update, text));
}

function localProp({ part }: ControlInput): string | undefined {
  const event = Object.keys(part.events).find((name) => localEvents.has(name));

  if (!event) return undefined;

  return event === 'onSelectionChange' ? 'selection' : 'value';
}

function changeFor(field: Field, update: () => void): Change {
  return ({ event, value, deliver }) => {
    const previous = field.value;
    const next = localEvents.has(event) ? value : previous;
    field.value = next;
    field.event = event;
    field.pending += 1;
    update();
    void deliver()
      .catch(() => {
        if (Object.is(field.value, next)) field.value = previous;
      })
      .finally(settled(field, update));
  };
}

function settled(field: Field, update: () => void): () => void {
  return () => {
    field.pending -= 1;
    update();
  };
}

function isPending(input: ControlInput, field: Field): boolean {
  return field.pending > 0 && blocking(input, field.event);
}

function blocking({ part, node }: ControlInput, event: string): boolean {
  if (node.type === 'ListItem') return false;

  return !throttle(part.events[event]);
}

function pendingValue(field: Field, source?: WireJson): WireJson | undefined {
  return field.pending ? field.value : source;
}

function focusOf(field: Field, update: () => void, text: boolean): PluginProps {
  if (!text) return {};

  return {
    onFocus: (): void => {
      field.focused = true;
    },
    onBlur: (): void => {
      field.focused = false;
      update();
    },
  };
}
