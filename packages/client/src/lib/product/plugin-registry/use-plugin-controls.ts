import type { WirePartDefinition } from '@repo/contracts/plugins/kit';
import {
  partEventRules,
  type PartEventRules,
  type WireNode,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';
import { useEffect, useReducer, useState } from 'react';
import { eventProps, type Change } from './plugin-events';
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
  local: Partial<PartEventRules>;
  focused: boolean;
  pending: Map<number, WireJson | undefined>;
  blocks: boolean;
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
  const field = matchingField(fields.get(input.context.key), input);
  const prop = field.local.value;

  if (!field.focused && prop !== undefined)
    syncField(field, input.source[prop]);
  fields.set(input.context.key, field);

  return field;
}

function matchingField(field: Field | undefined, input: ControlInput): Field {
  if (field?.type === input.node.type) return field;

  return {
    type: input.node.type,
    value: [0, undefined],
    local: localRules(input.part),
    focused: false,
    pending: new Map(),
    blocks: false,
  };
}

// The Part event whose metadata names a prop the App echoes at once.
const localRules = (part: WirePartDefinition): Partial<PartEventRules> =>
  Object.values(part.events)
    .map(partEventRules)
    .find((rules) => rules.value !== undefined) ?? {};

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
  const prop = field.local.value;

  if (prop !== undefined) props[prop] = currentValue(field);

  return Object.assign(props, focusOf(field, update), pendingProps(field));
}

function pendingProps(field: Field): PluginProps {
  const blocked = field.pending.size > 0 && field.blocks;

  return blocked ? { disabled: true, loading: true } : {};
}

function changeFor(field: Field, update: () => void): Change {
  return ({ rules, value, deliver }) => {
    const id = Math.max(field.value[0], ...field.pending.keys()) + 1;
    const next = rules.value ? value : currentValue(field);
    field.pending.set(id, next);
    field.blocks = rules.blocks;
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

// A coalesced field keeps what the user types while it has focus.
function focusOf(field: Field, update: () => void): PluginProps {
  if (!field.local.throttleMs) return {};

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
