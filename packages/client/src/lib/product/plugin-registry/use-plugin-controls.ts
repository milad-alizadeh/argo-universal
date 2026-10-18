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

type Value = [sequence: number, value: WireJson | undefined];

type Field = {
  value: Value;
  source?: WireJson;
  type: string;
  focused: boolean;
  pending: Map<number, WireJson | undefined>;
  event: string;
};

export function usePluginControls(root: WireNode): PluginControls {
  const [fields] = useState(() => new Map<string, Field>());
  const [, update] = useReducer((revision: number) => revision + 1, 0);
  useEffect(() => {
    for (const key of fields.keys())
      if (!findWireNode(root, key)) fields.delete(key);
  }, [fields, root]);

  return (input) => propsFor(input, fieldFor(fields, input), update);
}

function fieldFor(fields: Map<string, Field>, input: ControlInput): Field {
  const { node, context } = input;
  const source = input.source.value ?? input.source.selection;
  const field = matchingField(fields.get(context.key), node.type, source);

  if (!field.focused) syncField(field, source);
  fields.set(context.key, field);

  return field;
}

function matchingField(
  field: Field | undefined,
  type: string,
  source?: WireJson,
): Field {
  if (field?.type === type) return field;

  const value: Value = [0, source];
  const pending = new Map<number, WireJson | undefined>();

  return { type, value, source, focused: false, pending, event: '' };
}

function syncField(field: Field, source?: WireJson): void {
  if (!Object.is(field.source, source) && !currentRequest(field))
    field.value = [field.value[0], source];
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

  if (prop) props[prop] = currentValue(field);

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
    const id = Math.max(field.value[0], ...field.pending.keys()) + 1;
    const next = localEvents.has(event) ? value : currentValue(field);
    field.pending.set(id, next);
    field.event = event;
    update();
    void deliver()
      .then(() => accept(field, [id, next]))
      .catch(() => {})
      .finally(() => settled(field, id, update));
  };
}

function accept(field: Field, value: Value): void {
  if (value[0] > field.value[0]) field.value = value;
}

function settled(field: Field, id: number, update: () => void): void {
  field.pending.delete(id);
  update();
}

const currentValue = (field: Field): WireJson | undefined =>
  (currentRequest(field) ?? field.value)[1];

function currentRequest(field: Field): Value | undefined {
  const request = [...field.pending].at(-1);

  return request && request[0] > field.value[0] ? request : undefined;
}

function isPending(input: ControlInput, field: Field): boolean {
  return field.pending.size > 0 && blocking(input, field.event);
}

const blocking = ({ part, node }: ControlInput, event: string): boolean =>
  node.type !== 'ListItem' && !throttle(part.events[event]);

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
