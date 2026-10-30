import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  slotCounterRoot,
  slotCounterWaveEvent,
} from '@repo/contracts/plugins/wire-fixtures';
import { List } from '@repo/kit/primitives/lists/list';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginSlot, type PluginSlotContribution } from './plugin-slot';

// A second Plugin's contribution, for the order of two.
const trackerRoot: WireNode = {
  type: 'Text',
  key: '0',
  props: { children: 'No Tracker chosen' },
  children: [],
  slots: {},
};

const example: PluginSlotContribution = {
  pluginId: 'example',
  name: 'Example',
  root: slotCounterRoot,
  onEvent: fn(),
};

const tracker: PluginSlotContribution = {
  pluginId: 'issue-tracker',
  name: 'Issue tracker',
  root: trackerRoot,
  onEvent: fn(),
};

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Slot',
  component: PluginSlot,
  render: (args): React.JSX.Element => (
    <List appearance="plain">
      <PluginSlot {...args} />
    </List>
  ),
} satisfies Meta<typeof PluginSlot>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = { queryAllByRole: (role: 'heading') => HTMLElement[] };

const sectionTitles = (canvas: Canvas): (string | null)[] =>
  canvas.queryAllByRole('heading').map((heading) => heading.textContent);

export const NoContributions: Story = {
  args: { contributions: [] },
  play: async ({ canvas }) => {
    await expect(sectionTitles(canvas)).toEqual([]);
  },
};

export const OneContribution: Story = {
  args: { contributions: [example] },
  play: async ({ canvas, userEvent }) => {
    await expect(sectionTitles(canvas)).toEqual(['Example']);
    await expect(canvas.getByText('Hello from argo')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Wave' }));
    await expect(example.onEvent).toHaveBeenCalledWith('0/1', {
      event: slotCounterWaveEvent,
    });
  },
};

export const TwoContributions: Story = {
  args: { contributions: [example, tracker] },
  play: async ({ canvas }) => {
    await expect(sectionTitles(canvas)).toEqual(['Example', 'Issue tracker']);
    await expect(canvas.getByText('No Tracker chosen')).toBeVisible();
  },
};
