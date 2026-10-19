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

it.each([1, 2])(
  'gives a text-only Label the fallback icon for Label version %i',
  (version) => {
    const label: WireNode = {
      type: 'Label',
      key: 'version',
      props: { text: 'v1.2.0' },
      children: [],
      slots: {},
    };

    expect(prepareWireTree(label, { Label: version })).toEqual({
      ...label,
      props: {
        text: 'v1.2.0',
        icon: { sf: 'questionmark.circle', material: 'help' },
      },
    });
  },
);

it('keeps a text-only Label without an icon for Label version 3', () => {
  const label: WireNode = {
    type: 'Label',
    key: 'version',
    props: { text: 'v1.2.0' },
    children: [],
    slots: {},
  };

  expect(prepareWireTree(label, { Label: 3 })).toEqual(label);
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
    expect(prepareWireTree(node, { [type]: latest })).toEqual(node);
  },
);

// Every part's newest version.
const latest = Number.MAX_SAFE_INTEGER;

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
    expect(prepareWireTree(node, { [type]: latest })).toEqual(node);
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

it.each([2, 3])('leaves a multiple Picker out for Picker %i', (version) => {
  const node: WireNode = {
    type: 'Picker',
    key: 'labels',
    props: { label: 'Labels', multiple: true, options: [] },
    children: [],
    slots: {},
  };

  expect(prepareWireTree(node, { Picker: version })).toMatchObject({
    type: '#empty',
  });
});
