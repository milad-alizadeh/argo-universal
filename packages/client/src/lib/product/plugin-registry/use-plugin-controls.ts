import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';
import { isValidElement, useEffect, useReducer, useState } from 'react';
import { throttle } from '../plugin-dispatcher';
import { eventProps, localEvents, type Change } from './plugin-events';
import type {
  ControlInput,
  PluginProp,
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
  path?: string[];
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

  const pending = isPending(input, field) ? pendingProps(props, field) : props;

  const text = Boolean(input.part.events.onChangeText);

  return Object.assign(pending, focusOf(field, update, text));
}

function localProp({ part }: ControlInput): string | undefined {
  const event = Object.keys(part.events).find((name) => localEvents.has(name));

  if (!event) return undefined;

  return event === 'onSelectionChange' ? 'selection' : 'value';
}

// A nested handler, such as a Page's primary Action, disables only the object that holds it.
function pendingProps(props: PluginProps, { path = [] }: Field): PluginProps {
  const owner = path.slice(0, -1);

  if (!owner.length) return { ...props, disabled: true, loading: true };

  return disabledAt(props, owner);
}

function disabledAt(props: PluginProps, path: string[]): PluginProps {
  const [name, ...rest] = path;

  if (name === undefined) return { ...props, disabled: true };

  return { ...props, [name]: disabledIn(props[name], rest) };
}

function disabledIn(value: PluginProp, path: string[]): PluginProp {
  if (Array.isArray(value)) return disabledItem(value, path);

  return isPropsObject(value) ? disabledAt(value, path) : value;
}

function disabledItem(
  items: PluginProp[],
  [index, ...rest]: string[],
): PluginProp[] {
  return items.map((child, position) =>
    String(position) === index ? disabledIn(child, rest) : child,
  );
}

// Callers rule out arrays first.
function isPropsObject(value: PluginProp): value is PluginProps {
  if (!value || typeof value !== 'object') return false;

  return !isValidElement(value);
}

function changeFor(field: Field, update: () => void): Change {
  return ({ event, path, value, deliver }) => {
    const previous = field.value;
    const next = localEvents.has(event) ? value : previous;
    Object.assign(field, { value: next, event, path });
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
