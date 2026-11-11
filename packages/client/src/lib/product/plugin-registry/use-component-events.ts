import { propsWithin, type WireNode } from '@repo/contracts/plugins/wire';
import { wireNodeKeys } from '@repo/contracts/plugins/wire-node-key';
import { useEffect, useReducer, useState } from 'react';
import { componentEventProps } from './component-event-props';
import type { DrawnNodes } from './drawn-nodes';
import { ControlField, blurWithin } from './plugin-control-field';
import type { ControlInput, PluginControls } from './plugin-rendering';

type Fields = Map<string, ControlField>;

/*
 * One tree's Component events, handled once from each kit component's schema metadata: the callbacks its kit components take, the
 * value the App echoes at once and rolls back when refused, and the draft a focused field keeps.
 */
export function useComponentEvents(
  root: WireNode,
  drawn: DrawnNodes,
): PluginControls {
  const fields = useFields(root, drawn);
  const [, redraw] = useReducer((revision: number) => revision + 1, 0);

  return (input) => {
    const field = fieldFor({ fields, drawn }, input);
    // A node whose field changed forgets its drawing, then the tree draws again.
    const update = (): void => {
      drawn.forget(input.context.key);
      redraw();
    };

    return componentEventProps({ input, field, update });
  };
}

// Each node's field, by node key, while the node is in the tree.
function useFields(root: WireNode, drawn: DrawnNodes): Fields {
  const [fields] = useState<Fields>(() => new Map());
  useEffect(() => {
    const live = wireNodeKeys(root);

    for (const key of fields.keys()) if (!live.has(key)) fields.delete(key);
    drawn.keep(live);
  }, [fields, drawn, root]);

  return fields;
}

type TreeState = { fields: Fields; drawn: DrawnNodes };

function fieldFor(
  { fields, drawn }: TreeState,
  input: ControlInput,
): ControlField {
  const { key } = input.context;
  const field = ControlField.matching(fields.get(key), input);
  fields.set(key, field);
  syncEcho({ fields, drawn }, field, input);

  return field;
}

// A field that closes takes focus from the fields inside it, which then show the Server's value when they next draw.
function syncEcho(
  { fields, drawn }: TreeState,
  field: ControlField,
  input: ControlInput,
): void {
  const { value: prop, within } = field.rules;

  if (prop === undefined) return;
  field.sync(propsWithin(input.source, within)[prop]);

  if (!closed(field)) return;
  blurWithin(fields, input.context.key);
  drawn.forget(input.context.key);
}

const closed = (field: ControlField): boolean =>
  field.rules.value === 'open' && field.current === false;
