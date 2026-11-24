import { WireNode } from '@repo/contracts/plugins/wire';
import {
  boardListRoot,
  queueListRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { userEvent } from 'storybook/test';
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
} from './plugin-registry-fixtures';

const meta = {
  title: 'Design System/Patterns/PluginRegistry',
  component: PluginTree,
  parameters: { screenPreview: true },
  argTypes: { root: { control: false }, onPageCall: { control: false } },
  args: { ...slottedRowTree, onPageCall: action('Page call') },
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

function SlotPreview({ root, onPageCall }: PluginTreeProps): ReactElement {
  const [count, setCount] = useState(0);

  return (
    <PluginTree
      root={rowWithCount(root, count)}
      onPageCall={async (call, event) => {
        await onPageCall?.(call, event);
        setCount((value) => value + 1);
      }}
    />
  );
}

/*
 * One story per drawing path RenderNode takes: a kit component's slots, its children, and each entry it
 * looks up in the registry. A node the App cannot draw has no story: the Server sends
 * "Update Argo to see this" in its place, which plugin-compatibility.test.stories.tsx asserts.
 */

// A kit component's named slots hold nodes of their own; pressing the Button patches the node beside it.
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

export const Slider: Story = { args: sliderTree };

export const FieldGroup: Story = { args: fieldGroupTree };

export const IconButton: Story = { args: iconButtonTree };

export const SplitButton: Story = { args: splitButtonTree };

const produce = [
  { key: 'fruit', title: 'Fruit', rows: ['Apple', 'Pear'] },
  { key: 'veg', title: 'Vegetables', rows: ['Leek', 'Kale'] },
];

// A List whose Sections hold rows, and which a person can search: the rows a search misses leave, and so do their Sections.
const sectionedTree: WireNode = WireNode.parse({
  type: 'List',
  key: 'produce',
  props: { accessibilityLabel: 'Produce', searchMode: 'app' },
  slots: {},
  children: produce.map(({ key, title, rows }) => ({
    type: 'List.Section',
    key,
    props: { title },
    slots: {},
    children: rows.map((row) => ({
      type: 'ListItem',
      key: row,
      props: { id: row, title: row },
      slots: {},
      children: [],
    })),
  })),
});

export const SectionedList: Story = { args: { root: sectionedTree } };

export const SearchedSections: Story = {
  args: { root: sectionedTree },
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText('Search'), 'kale');
  },
};

// A List with `onMove` and a Section: its rows move by drag or the Move to… action.
export const MovableList: Story = { args: { root: queueListRoot } };

export const MovableLanes: Story = { args: { root: boardListRoot } };
