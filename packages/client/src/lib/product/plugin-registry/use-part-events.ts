import { propsWithin, type WireNode } from '@repo/contracts/plugins/wire';
import { wireNodeKeys } from '@repo/contracts/plugins/wire-node-key';
import { errorMessage } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useEffect, useReducer, useState } from 'react';
import { partEventProps } from './part-event-props';
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

/*
 * One tree's Part events, handled once from each part's schema metadata: the callbacks its kit components take, the
 * value the App echoes at once and rolls back when refused, the draft a focused field keeps, and the throttled sends.
 */
export function usePartEvents(
  root: WireNode,
  onEvent: PluginOnEvent,
): PluginControls {
  const dispatcher = useDispatcher(onEvent);
  const fields = useFields(root);
  const [, update] = useReducer((revision: number) => revision + 1, 0);
  const send = dispatcher.send.bind(dispatcher);

  return (input) =>
    partEventProps({ input, field: fieldFor(fields, input), send, update });
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
