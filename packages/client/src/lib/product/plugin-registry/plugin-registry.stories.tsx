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

export default meta;

function SlotPreview(): ReactElement {
  const [count, setCount] = useState(0);

  const root = applyPatch(slottedRow, [
    {
      op: 'setProps',
      key: [{ slot: 'accessories', key: 'count' }],
      props: { label: `Count ${count}` },
    },
  ]);

  return (
    <PluginTree root={root} onEvent={() => setCount((value) => value + 1)} />
  );
}

export const Slots: StoryObj<typeof meta> = {
  render: SlotPreview,
};

export const Svg: StoryObj<typeof meta> = {
  render: () => (
    <PluginTree
      root={{
        type: 'Svg',
        key: '0',
        props: {
          xml: svgFixtures.valid[0]!.xml,
          label: 'Service map',
          tone: 'info',
          onPress: { $event: 'onPress' },
        },
        children: [],
        slots: {},
      }}
      onEvent={() => {}}
    />
  ),
};
