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

// A Device with a camera can go back to it from the typed page without leaving Add a Server.
export const ScanInsteadGoesBackToTheCamera: Story = {
  args: { onScan: fn() },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Scan instead' }));
    await expect(args.onScan).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// A Device with no camera has nothing to go back to, so the page offers no way.
export const NoCameraOffersNoWayBack: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Scan instead' }),
    ).toBeNull();
  },
};

// A host and a port typed in the field go out as typed, for the pairing to knock at that address alone.
export const AHostAndPortGoWithTheCode: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Code'), '482915');
    await userEvent.type(canvas.getByLabelText('Address'), 'desk.local:4000');
    await userEvent.click(canvas.getByRole('button', { name: 'Connect' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      '482915',
      'desk.local:4000',
    );
  },
};
