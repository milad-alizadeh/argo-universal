import { kitComponent } from '@repo/contracts/plugins/kit';
import type { PageEvent } from '@repo/contracts/plugins/page-calls';
import type { DrawRequest } from '@repo/contracts/plugins/page-draw';
import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

// The Create button, which takes the draft and shows it is creating.
const createButton = (draft: string): WireNode =>
  node('Button', 'create', {
    label: 'Create',
    onPress: {
      operation: 'create',
      args: { title: draft },
      optimistic: [{ key: 'create', props: { label: 'Creating' } }],
    },
  });

// A draft field whose typing is Page state, and a Create button that takes the draft and shows it is creating.
export function draftPage({ pageState }: DrawRequest, edition = 0): WireNode {
  const draft = String(pageState.draft ?? '');

  const field = node('FieldGroup.TextField', 'draft', {
    label: `Title ${edition}`,
    value: draft,
    onChangeText: { pageState: { draft: { $payload: true } } },
  });

  return {
    ...node('Stack', 'page', {}),
    children: [field, createButton(draft)],
  };
}

const keyOf = (key: string): string =>
  childNodeKey(childNodeKey('', 'page'), key);

const schemaOf = (type: string, name: string): PageEvent['schema'] => {
  const schema = kitComponent(type)?.events[name];

  if (!schema) throw new Error(`${type} has no ${name}`);

  return schema;
};

export const labelOf = (root: WireNode | undefined): WireJson | undefined =>
  root?.children[1]?.props.label;

// The first control's label, which shows the draw its page came from.
export const fieldLabelOf = (
  root: WireNode | undefined,
): WireJson | undefined => root?.children[0]?.props.label;

// Typing `text` into the draft field.
export const typing = (text: string): PageEvent => ({
  key: keyOf('draft'),
  name: 'onChangeText',
  schema: schemaOf('FieldGroup.TextField', 'onChangeText'),
  payload: text,
});

// Pressing Create.
export const pressing: PageEvent = {
  key: keyOf('create'),
  name: 'onPress',
  schema: schemaOf('Button', 'onPress'),
};
