import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  helloSlotRoot,
  helloSlotWaveEventId,
} from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { GroupedList } from '#primitives/lists/grouped-list';
import { PluginSlot, type PluginSlotContribution } from './plugin-slot';

// A second Plugin's contribution, for the order of two.
const trackerRoot: WireNode = {
  type: 'Text',
  key: '0',
  props: { label: 'No Tracker chosen' },
  children: [],
  slots: {},
};

const hello: PluginSlotContribution = {
  pluginId: 'hello',
  name: 'Hello',
  root: helloSlotRoot,
  onEvent: fn(),
};

const tracker: PluginSlotContribution = {
  pluginId: 'issue-tracker',
  name: 'Issue tracker',
  root: trackerRoot,
  onEvent: fn(),
};

const meta = {
  title: 'Tests/PluginSlot',
  component: PluginSlot,
  render: (args): React.JSX.Element => (
    <GroupedList>
      <PluginSlot {...args} />
    </GroupedList>
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
  args: { contributions: [hello] },
  play: async ({ canvas, userEvent }) => {
    await expect(sectionTitles(canvas)).toEqual(['Hello']);
    await expect(canvas.getByText('Hello from argo')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Wave' }));
    await expect(hello.onEvent).toHaveBeenCalledWith(helloSlotWaveEventId);
  },
};

export const TwoContributions: Story = {
  args: { contributions: [hello, tracker] },
  play: async ({ canvas }) => {
    await expect(sectionTitles(canvas)).toEqual(['Hello', 'Issue tracker']);
    await expect(canvas.getByText('No Tracker chosen')).toBeVisible();
  },
};
