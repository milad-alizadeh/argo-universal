import { WireProps, type WireJson } from '@repo/contracts/plugins/wire';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { wireNodeKeys } from '@repo/contracts/plugins/wire-node-key';
import { useEffect, useReducer, useState } from 'react';
import {
  matchingField,
  syncField,
  blurWithin,
  changeFor,
  currentValue,
  focusOf,
  blocked,
  type Field,
} from './plugin-control-field';
import { eventProps } from './plugin-events';
import { withNestedEvents } from './plugin-nested-events';
import type {
  ControlInput,
  PluginProps,
  PluginControls,
} from './plugin-rendering';

export function usePluginControls(root: WireNode): PluginControls {
  const [fields] = useState(() => new Map<string, Field>());
  const [, update] = useReducer((revision: number) => revision + 1, 0);
  useEffect(() => {
    const live = wireNodeKeys(root);

    for (const key of fields.keys()) if (!live.has(key)) fields.delete(key);
  }, [fields, root]);

  return (input) => propsFor(input, fieldFor(fields, input), update);
}

function fieldFor(fields: Map<string, Field>, input: ControlInput): Field {
  const { key } = input.context;
  const field = matchingField(fields.get(key), input);
  fields.set(key, field);
  syncEcho(fields, field, input);

  return field;
}

function syncEcho(
  fields: Map<string, Field>,
  field: Field,
  input: ControlInput,
): void {
  const prop = field.rules.value;

  if (prop === undefined) return;
  const source = echoSource(input.source, field.rules.within);
  syncField(field, source[prop]);

  if (closed(field)) blurWithin(fields, input.context.key);
}

function echoSource(
  source: WireNode['props'],
  within?: string,
): WireNode['props'] {
  return within === undefined ? source : propsRecord(source[within] ?? null);
}

const closed = (field: Field): boolean =>
  field.rules.value === 'open' && currentValue(field) === false;

function echoValue(props: PluginProps, field: Field): void {
  const prop = field.rules.value;

  if (prop === undefined) return;
  const within = field.rules.within;

  if (within === undefined) props[prop] = currentValue(field);
  else echoWithin(props, field, { within, prop });
}

function propsFor(
  input: ControlInput,
  field: Field,
  update: () => void,
): PluginProps {
  const props = {
    ...input.node.props,
    ...eventProps(input, changeFor(field, update)),
  };

  echoValue(props, field);
  const placed = withNestedEvents(input, props);

  return { ...placed, ...focusOf(field, update), ...pendingProps(field) };
}

function echoWithin(
  props: PluginProps,
  field: Field,
  { within, prop }: { within: string; prop: string },
): void {
  const holder = WireProps.safeParse(props[within]).data;

  if (holder) props[within] = { ...holder, [prop]: currentValue(field) };
}

function pendingProps(field: Field): PluginProps {
  return blocked(field) ? { disabled: true, loading: true } : {};
}

function propsRecord(value: WireJson): WireProps {
  if (value === null) return {};

  if (typeof value === 'object') return arrayOrProps(value);

  return {};
}

function arrayOrProps(
  value: Extract<NonNullable<WireJson>, object>,
): WireProps {
  return Array.isArray(value) ? {} : value;
}
