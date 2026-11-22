import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ChooseBarMock } from '../../hooks/draft-bar-choose.mocks';
import { leftNotes } from '../draft-comment/draft-comment-fixtures';

const meta = {
  title: 'Plugins/DraftChooseFeedback',
  component: ChooseBarMock,
  parameters: { screenPreview: true },
  argTypes: {
    withRegions: { control: false },
    calls: { control: false },
    notes: { control: false },
    reply: { control: false },
    commenting: { control: 'boolean' },
    showPage: { control: false },
  },
  args: { withRegions: true, calls: [], showPage: true, notes: leftNotes },
} satisfies Meta<typeof ChooseBarMock>;

export default meta;

type Story = StoryObj<typeof meta>;

const choose: NonNullable<Story['play']> = async ({ canvas, userEvent }) => {
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Choose · 2 comments' }),
  );
};

export const Delivered: Story = { play: choose };

export const VariantUnavailable: Story = {
  args: { reply: 'unavailable' },
  play: choose,
};

export const NoDrawingSession: Story = {
  args: { reply: 'no-session' },
  play: choose,
};

export const DarkComments: Story = {
  args: { commenting: true },
  globals: { mode: 'dark' },
};
