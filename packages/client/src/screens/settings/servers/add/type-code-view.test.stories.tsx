import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { TypeCodeView } from './type-code-view';

const meta = {
  title: 'Tests/Screens/Settings/TypeCodeView',
  component: TypeCodeView,
  parameters: { screenPreview: true },
  args: { onSubmit: fn() },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof TypeCodeView>;

export default meta;

type Story = StoryObj<typeof meta>;

// What was typed goes out as its characters: whether they are a code is the caller's, so a mistake is told one way whatever it was.
export const ConnectSendsWhatWasTyped: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Code'), '482 915');
    await userEvent.click(canvas.getByRole('button', { name: 'Connect' }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith('482915', undefined);
  },
};

// Return in the field is Connect.
export const ReturnSendsIt: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Code'), '482-915{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith('482915', undefined);
  },
};

// A code that is out for asking cannot be sent again, so a second press cannot spend a try.
export const LookingCannotBeSentTwice: Story = {
  args: { looking: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Looking…' }),
    ).toBeDisabled();
    await expect(canvas.getByLabelText('Code')).toBeDisabled();
  },
};

// An address typed beside the code goes with it, so the pairing tries it first.
export const AnAddressGoesWithTheCode: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Code'), '482915');
    await userEvent.type(
      canvas.getByLabelText('Address'),
      ' studio-mac.local ',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Connect' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      '482915',
      'studio-mac.local',
    );
  },
};

export const ThereIsNoWayBackToTheCameraBesideConnect: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Scan instead' }),
    ).toBeNull();
  },
};
