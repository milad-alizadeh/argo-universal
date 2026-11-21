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

// A press on a node opens the note against it, with the node outlined: a popover below the node on a wide window after a pointer press, a sheet from the bottom edge on a phone after a long press.
export const Editor: Story = {
  args: { longPressMilliseconds: 60 },
  play: async ({ canvas }) => {
    await holdOn(await canvas.findByText('Pairing code expires'), 120);
  },
};
