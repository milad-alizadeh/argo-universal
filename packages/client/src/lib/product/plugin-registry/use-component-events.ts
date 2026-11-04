import { propsWithin, type WireNode } from '@repo/contracts/plugins/wire';
import { wireNodeKeys } from '@repo/contracts/plugins/wire-node-key';
import { useEffect, useReducer, useState } from 'react';
import { componentEventProps } from './component-event-props';
import { ControlField, blurWithin } from './plugin-control-field';
import type { ControlInput, PluginControls } from './plugin-rendering';

type Fields = Map<string, ControlField>;

/*
 * One tree's Component events, handled once from each kit component's schema metadata: the callbacks its kit components take, the
 * value the App echoes at once and rolls back when refused, and the draft a focused field keeps.
 */
export function useComponentEvents(root: WireNode): PluginControls {
  const fields = useFields(root);
  const [, update] = useReducer((revision: number) => revision + 1, 0);

  return (input) => {
    const field = fieldFor(fields, input);

    return componentEventProps({ input, field, update });
  };
}

// Each node's field, by node key, while the node is in the tree.
function useFields(root: WireNode): Fields {
  const [fields] = useState<Fields>(() => new Map());
  useEffect(() => {
    const live = wireNodeKeys(root);

    for (const key of fields.keys()) if (!live.has(key)) fields.delete(key);
  }, [fields, root]);

  return fields;
}

function fieldFor(fields: Fields, input: ControlInput): ControlField {
  const { key } = input.context;
  const field = ControlField.matching(fields.get(key), input);
  fields.set(key, field);
  syncEcho(fields, field, input);

  return field;
}

function syncEcho(
  fields: Fields,
  field: ControlField,
  input: ControlInput,
): void {
  const { value: prop, within } = field.rules;

  if (prop === undefined) return;
  field.sync(propsWithin(input.source, within)[prop]);

  if (closed(field)) blurWithin(fields, input.context.key);
}

const closed = (field: ControlField): boolean =>
  field.rules.value === 'open' && field.current === false;
