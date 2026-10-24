import type { WirePartDefinition } from '@repo/contracts/plugins/kit';
import {
  partEventRules,
  type PartEventRules,
  type WireNode,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import { wireNodeKeys } from '@repo/contracts/plugins/wire-node-key';
import { useEffect, useReducer, useState } from 'react';
import { eventProps, type Change, type Edit } from './plugin-events';
import { withNestedEvents } from './plugin-nested-events';
import type {
  ControlInput,
  PluginProps,
  PluginControls,
} from './plugin-rendering';

type Value = { sequence: number; value: WireJson | undefined };

type Request = { value: WireJson | undefined; blocks: boolean };

type Field = {
  value: Value;
  // The Server's latest value, and whether the field has yet to show it.
  source?: WireJson;
  stale: boolean;
  type: string;
  rules: Partial<PartEventRules>;
  focused: boolean;
  pending: Map<number, Request>;
};

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
  syncField(field, input.source[prop]);

  // Closing an overlay unmounts its fields without a blur.
  if (closed(field)) blurWithin(fields, input.context.key);
}

const closed = (field: Field): boolean =>
  field.rules.value === 'open' && currentValue(field) === false;

function matchingField(field: Field | undefined, input: ControlInput): Field {
  if (field?.type === input.node.type) return field;

  return {
    type: input.node.type,
    value: { sequence: 0, value: undefined },
    stale: false,
    rules: echoRules(input.part),
    focused: false,
    pending: new Map(),
  };
}

// The Part event whose metadata names a prop the App echoes at once.
const echoRules = (part: WirePartDefinition): Partial<PartEventRules> =>
  Object.values(part.events)
    .map(partEventRules)
    .find((rules) => rules.value !== undefined) ?? {};

// The Server's value shows once the field has no focus and no edit pending.
function syncField(field: Field, source?: WireJson): void {
  if (!Object.is(field.source, source))
    Object.assign(field, { source, stale: true });

  if (showsServer(field))
    Object.assign(field, {
      value: { ...field.value, value: source },
      stale: false,
    });
}

const showsServer = (field: Field): boolean =>
  field.stale && !field.focused && field.pending.size === 0;

function blurWithin(fields: Map<string, Field>, key: string): void {
  for (const [child, field] of fields)
    if (isDescendant(child, key)) field.focused = false;
}

const isDescendant = (child: string, key: string): boolean =>
  child.startsWith(`${key}/`) || child.startsWith(`${key}#`);

function propsFor(
  input: ControlInput,
  field: Field,
  update: () => void,
): PluginProps {
  const change = changeFor(field, update);

  const props = withNestedEvents(input, {
    ...input.node.props,
    ...eventProps(input, change),
  });

  const prop = field.rules.value;

  if (prop !== undefined) props[prop] = currentValue(field);
  const pending = blocked(field) ? { disabled: true, loading: true } : {};

  return Object.assign(props, focusOf(field, update), pending);
}

const blocked = (field: Field): boolean =>
  [...field.pending.values()].some((request) => request.blocks);

// A blocking event waits for the one before it; an echo of the shown value changes nothing.
function changeFor(field: Field, update: () => void): Change {
  return (edit) => {
    if (waiting(field, edit) || echoed(field, edit)) return;
    request(field, edit, update);
  };
}

const waiting = (field: Field, edit: Edit): boolean =>
  edit.rules.blocks && blocked(field);

const echoed = (field: Field, edit: Edit): boolean =>
  edit.rules.value !== undefined && Object.is(edit.value, currentValue(field));

function request(field: Field, edit: Edit, update: () => void): void {
  const sequence = Math.max(field.value.sequence, ...field.pending.keys()) + 1;
  const value = edit.rules.value ? edit.value : currentValue(field);
  field.pending.set(sequence, { value, blocks: edit.rules.blocks });
  update();
  void edit
    .deliver()
    .then(() => accept(field, { sequence, value }))
    // A refused edit leaves the last accepted value showing.
    .catch(() => {})
    .finally(() => settled(field, sequence, update));
}

function accept(field: Field, value: Value): void {
  if (value.sequence > field.value.sequence) field.value = value;
}

function settled(field: Field, sequence: number, update: () => void): void {
  field.pending.delete(sequence);
  update();
}

// The newest pending edit shows until an edit after it is accepted.
function currentValue(field: Field): WireJson | undefined {
  const last = [...field.pending].at(-1);

  return last && last[0] > field.value.sequence
    ? last[1].value
    : field.value.value;
}

// A coalesced field keeps what the user types while it has focus.
function focusOf(field: Field, update: () => void): PluginProps {
  if (!field.rules.throttleMs) return {};

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
