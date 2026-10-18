import type { WireNode } from '@repo/contracts/plugins/wire';
import { slottedRow } from '@repo/contracts/plugins/wire-fixtures';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import svgFixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Shared/PluginTree',
  parameters: { screenPreview: true },
} satisfies Meta;

function firstSvgXml(): string {
  const fixture = svgFixtures.valid[0];

  if (!fixture) throw new Error('Missing valid SVG fixture');

  return fixture.xml;
}

const svgXml = firstSvgXml();

export default meta;

function SlotPreview(): ReactElement {
  const [count, setCount] = useState(0);
  const root = rowWithCount(count);

  return (
    <PluginTree root={root} onEvent={() => setCount((value) => value + 1)} />
  );
}

function rowWithCount(count: number): WireNode {
  return applyPatch(slottedRow, [
    {
      op: 'setProps',
      key: [{ slot: 'accessories', key: 'count' }],
      props: { label: `Count ${count}` },
    },
  ]);
}

export const Slots: StoryObj<typeof meta> = {
  render: SlotPreview,
};

export const Svg: StoryObj<typeof meta> = {
  render: SvgPreview,
};

function SvgPreview(): ReactElement {
  return <PluginTree root={svgRoot()} onEvent={() => {}} />;
}

function svgRoot(): WireNode {
  return {
    type: 'Svg',
    key: '0',
    props: {
      xml: svgXml,
      label: 'Service map',
      tone: 'info',
      onPress: { $event: 'onPress' },
    },
    children: [],
    slots: {},
  };
}
