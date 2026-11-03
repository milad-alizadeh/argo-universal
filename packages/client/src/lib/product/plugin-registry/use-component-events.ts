import { propsWithin, type WireNode } from '@repo/contracts/plugins/wire';
import { wireNodeKeys } from '@repo/contracts/plugins/wire-node-key';
import { errorMessage } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useEffect, useReducer, useState } from 'react';
import { componentEventProps, type NodeEvents } from './component-event-props';
import type { DrawnNodes } from './drawn-nodes';
import { ControlField, blurWithin } from './plugin-control-field';
import {
  PluginDispatcher,
  type PluginOnEvent,
  type ReportFailure,
} from './plugin-dispatcher';
import type { ControlInput, PluginControls } from './plugin-rendering';

const reportFailure: ReportFailure = (error): void =>
  showToast({
    title: 'Plugin action failed',
    message: errorMessage(error),
    tone: 'danger',
  });

type Fields = Map<string, ControlField>;

// A tree's fields and the drawing each node keeps: a field that changes draws its node again.
type TreeState = { fields: Fields; drawn: DrawnNodes };

/*
 * One tree's Component events, handled once from each kit component's schema metadata: the callbacks its kit components take, the
 * value the App echoes at once and rolls back when refused, the draft a focused field keeps, and the throttled sends.
 */
export function useComponentEvents(
  root: WireNode,
  onEvent: PluginOnEvent,
  drawn: DrawnNodes,
): PluginControls {
  const dispatcher = useDispatcher(onEvent);
  const tree = { fields: useFields(root, drawn), drawn };
  const [, update] = useReducer((revision: number) => revision + 1, 0);

  return (input) =>
    componentEventProps({
      input,
      send: dispatcher.send.bind(dispatcher),
      ...nodeState(tree, input, update),
    });
}

// A node's field, and how it draws again: a node whose field changed forgets its drawing, then the tree draws again.
function nodeState(
  tree: TreeState,
  input: ControlInput,
  update: () => void,
): Pick<NodeEvents, 'field' | 'update'> {
  return {
    field: fieldFor(tree, input),
    update: (): void => {
      tree.drawn.forget(input.context.key);
      update();
    },
  };
}

// One dispatcher for the tree's life; closing it sends what is still queued.
function useDispatcher(onEvent: PluginOnEvent): PluginDispatcher {
  const [dispatcher] = useState(
    () => new PluginDispatcher(onEvent, reportFailure),
  );

  useEffect(() => {
    dispatcher.setDelivery(onEvent);
  }, [dispatcher, onEvent]);
  useEffect(() => (): void => dispatcher.close(), [dispatcher]);

  return dispatcher;
}

// Each node's field and drawing, by node key, while the node is in the tree.
function useFields(root: WireNode, drawn: DrawnNodes): Fields {
  const [fields] = useState<Fields>(() => new Map());
  useEffect(() => {
    const live = wireNodeKeys(root);

    for (const key of fields.keys()) if (!live.has(key)) fields.delete(key);
    drawn.keep(live);
  }, [fields, drawn, root]);

  return fields;
}

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
