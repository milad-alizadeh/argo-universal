import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { leftNotes } from './draft-comment-fixtures';
import { CommentingPage, holdOn } from './draft-comments-page.mocks';

// A Draft page while its author comments; the notes already left show their pins.
const meta = {
  title: 'Plugins/DraftComments',
  component: CommentingPage,
  argTypes: {
    commenting: { control: 'boolean' },
    notes: { control: false },
    longPressMilliseconds: { control: false },
  },
  args: { commenting: true, notes: leftNotes },
} satisfies Meta<typeof CommentingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// A note leaves a pin on its node, the number of notes there.
export const Pins: Story = {};

// A pointer press on a wide window picks the node under it and opens a popover on it, with the node outlined.
export const Popover: Story = {
  play: async ({ canvas }) => {
    await holdOn(await canvas.findByText('Pairing code expires'), 0);
  },
};

// A long press on a phone raises the same note in a sheet from the bottom edge.
export const Sheet: Story = {
  globals: { mode: 'light', viewport: { value: 'phone' } },
  args: { longPressMilliseconds: 60 },
  play: async ({ canvas }) => {
    await holdOn(await canvas.findByText('Pairing code expires'), 120);
  },
};
