import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { PluginTree, type PluginTreeProps } from './plugin-registry';
import {
  canvasTree,
  fieldGroupTree,
  iconButtonTree,
  openSheetTree,
  sliderTree,
  slottedRowTree,
  splitButtonTree,
  svgTree,
  switchTree,
} from './plugin-registry-fixtures';

const meta = {
  title: 'Design System/Patterns/PluginRegistry',
  component: PluginTree,
  parameters: { screenPreview: true },
  argTypes: { root: { control: false }, onEvent: { control: false } },
  args: { ...slottedRowTree, onEvent: action('Plugin event') },
} satisfies Meta<typeof PluginTree>;

export default meta;

type Story = StoryObj<typeof meta>;

function rowWithCount(root: WireNode, count: number): WireNode {
  return applyPatch(root, [
    {
      op: 'setProps',
      key: [{ slot: 'trailing', key: 'count' }],
      props: { label: `Count ${count}` },
    },
  ]);
}

function SlotPreview({ root, onEvent }: PluginTreeProps): ReactElement {
  const [count, setCount] = useState(0);

  return (
    <PluginTree
      root={rowWithCount(root, count)}
      onEvent={(key, event) => {
        void onEvent(key, event);
        setCount((value) => value + 1);
      }}
    />
  );
}

/*
 * One story per drawing path RenderNode takes: a part's slots, its children, and each entry it
 * looks up in the registry. A node whose type is not in the registry has no story: it draws
 * "Update Argo to see this", which plugin-compatibility.test.stories.tsx asserts.
 */

// A part's named slots hold nodes of their own; pressing the Button patches the node beside it.
export const Slots: Story = {
  args: slottedRowTree,
  render: (args) => <SlotPreview {...args} />,
};

// An Svg node draws the Plugin's own artwork inside the tree's SVG budget.
export const Svg: Story = { args: svgTree };

// A Canvas node keys its children by their own key, so the scene survives a redraw.
export const Canvas: Story = { args: canvasTree };

// An overlay is an ordinary node: the Sheet opens in place rather than outside the tree.
export const Overlays: Story = { args: openSheetTree };

export const Switch: Story = { args: switchTree };

export const Slider: Story = { args: sliderTree };

export const FieldGroup: Story = { args: fieldGroupTree };

export const IconButton: Story = { args: iconButtonTree };

export const SplitButton: Story = { args: splitButtonTree };
