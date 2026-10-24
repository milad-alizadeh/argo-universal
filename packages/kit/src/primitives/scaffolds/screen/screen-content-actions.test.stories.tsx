import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Action } from '#primitives/actions/action';
import { Screen } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/ContentActions',
  component: Screen,
  args: { title: 'Projects' },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

const pressed = fn();

// The Screen's `actions` are its header; an Action in its content is not a header Action.
export const ContentAddsNoHeaderActions: Story = {
  args: {
    title: 'Issue',
    actions: (
      <Action label="Share" icon="filters" onPress={() => pressed('share')} />
    ),
    children: (
      <Action label="Edit" icon="rename" onPress={() => pressed('edit')} />
    ),
  },
  play: async ({ canvas, userEvent }) => {
    pressed.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
    await expect(pressed.mock.calls).toEqual([['share']]);
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
  },
};
