import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { List } from '#primitives/lists/list';
import { ListItem } from './index';

const title = 'Show closed pull requests';

const meta = {
  title: 'Tests/Design System/Primitives/ListItem/Toggle',
  component: ListItem.Toggle,
  args: { title, value: false, onValueChange: fn() },
  render: (args): React.JSX.Element => (
    <List appearance="grouped">
      <List.Section>
        <ListItem.Toggle {...args} />
      </List.Section>
    </List>
  ),
} satisfies Meta<typeof ListItem.Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OneNamedSwitch: Story = {
  args: { value: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByRole('switch')).toHaveLength(1);
    await expect(canvas.getByRole('switch', { name: title })).toBeChecked();
  },
};

export const WholeRowToggles: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: title }));
    await expect(args.onValueChange).toHaveBeenCalledWith(true);
  },
};

export const KeyboardToggles: Story = {
  play: async ({ args, canvas, userEvent }) => {
    (await canvas.findByRole('switch', { name: title })).focus();
    await userEvent.keyboard(' ');
    await expect(args.onValueChange).toHaveBeenCalledWith(true);
  },
};

export const DisabledCannotToggle: Story = {
  args: { disabled: true },
  play: async ({ args, canvas, userEvent }) => {
    const row = await canvas.findByRole('switch', { name: title });
    await expect(row).toHaveAttribute('aria-disabled', 'true');
    row.focus();
    await userEvent.keyboard(' ');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
