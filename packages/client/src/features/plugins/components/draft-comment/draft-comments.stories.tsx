import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { leftNotes } from './draft-comment-fixtures';
import { CommentingPage, holdOn } from './draft-comments-page.mocks';

const meta = {
  title: 'Plugins/DraftComments',
  component: CommentingPage,
  argTypes: {
    commenting: { control: 'boolean' },
    notes: { control: false },
    longPressMilliseconds: { control: false },
    onPageCall: { control: false },
    root: { control: false },
    regions: { control: false },
  },
  args: { commenting: true, notes: leftNotes },
} satisfies Meta<typeof CommentingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pins: Story = {};

export const Editor: Story = {
  args: { longPressMilliseconds: 60 },
  play: async ({ canvas }) => {
    await holdOn(await canvas.findByText('Pairing code expires'), 120);
  },
};
