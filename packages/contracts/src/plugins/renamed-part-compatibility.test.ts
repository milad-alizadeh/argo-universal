import { expect, it } from 'vitest';
import {
  previousAppFixtures,
  previousDraftFixtures,
} from '../../mocks/renamed-part-fixtures';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

it.each([
  {
    name: 'named system symbol',
    icon: 'check',
    legacy: { sf: 'checkmark', material: 'check' },
  },
  {
    name: 'named Tabler symbol',
    icon: 'branch',
    legacy: { sf: 'questionmark.circle', material: 'help' },
  },
])('lowers a Label $name for the previous App version', ({ icon, legacy }) => {
  const label: WireNode = {
    type: 'Label',
    key: 'label',
    props: { text: 'Ready', icon },
    children: [],
    slots: {},
  };

  expect(prepareWireTree(label, { Label: 1 })).toEqual({
    ...label,
    props: { text: 'Ready', icon: legacy },
  });
  expect(prepareWireTree(label, { Label: 2 })).toEqual(label);
});

it.each(previousAppFixtures)(
  'lowers $type names and values for the previous App',
  ({ type, props, legacy }) => {
    const node: WireNode = {
      type,
      key: 'part',
      props,
      children: [],
      slots: {},
    };

    expect(prepareWireTree(node, { [type]: 1 })).toEqual({
      ...node,
      props: legacy,
    });
    expect(prepareWireTree(node, { [type]: 2 })).toEqual(node);
  },
);

it.each(previousDraftFixtures)(
  'keeps representable $type fields in the prior draft schema',
  ({ type, props, legacy }) => {
    const node: WireNode = {
      type,
      key: 'draft',
      props,
      children: [],
      slots: {},
    };

    expect(prepareWireTree(node, { [type]: 1 })).toEqual({
      ...node,
      props: legacy,
    });
    expect(prepareWireTree(node, { [type]: 2 })).toEqual(node);
  },
);

it('lowers responsive Text and its ordered content without leaking undefined props', () => {
  const text: WireNode = {
    type: 'Text',
    key: 'text',
    props: {
      children: ['Count: ', 2],
      role: { compact: 'body', wide: 'heading' },
    },
    children: [],
    slots: {},
  };

  expect(prepareWireTree(text, { Text: 2 }).props).toEqual({
    label: 'Count: 2',
    variant: 'body',
  });
  expect(
    prepareWireTree({ ...text, props: { children: 'Body' } }, { Text: 1 })
      .props,
  ).toEqual({ label: 'Body' });
});
