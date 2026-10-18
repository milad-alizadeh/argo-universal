import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListSwitchItem } from './grouped-list-switch-item';

const label = 'Show closed pull requests';

const meta = {
  title: 'Tests/Design System/Primitives/GroupedListSwitchItem',
  component: GroupedListSwitchItem,
  args: { label, value: false, onValueChange: fn() },
  render: (args) => (
    <GroupedList>
      <GroupedListSection>
        <GroupedListSwitchItem {...args} />
      </GroupedListSection>
    </GroupedList>
  ),
} satisfies Meta<typeof GroupedListSwitchItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TheRowIsOneNamedSwitch: Story = {
  args: { value: true },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('switch')).toHaveLength(1);
    await expect(canvas.getByRole('switch', { name: label })).toBeChecked();
  },
};

export const PressingTheRowFlipsIt: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('switch', { name: label }));
    await expect(args.onValueChange).toHaveBeenCalledWith(true);
  },
};

export const ADisabledRowSaysSo: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', { name: label })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
};
