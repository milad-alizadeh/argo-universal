import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { VoiceDetailView } from './voice-detail-view';
import { unusableVoice, usableVoice } from './voice-detail-view-fixtures';

const meta = {
  title: 'Tests/Screens/Settings/Voice',
  component: VoiceDetailView,
  parameters: { screenPreview: true },
  args: {
    voice: { status: 'loaded', settings: usableVoice },
    onEnabledChange: fn(),
    onProviderChange: fn(),
    onVoiceChange: fn(),
    onRetry: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof VoiceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const voiceCalls = { name: 'Voice calls' };

export const UsableProviderShowsItsChoicesAndNoReason: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', voiceCalls)).toBeChecked();
    await expect(canvas.getByText('GPT-Live')).toBeVisible();
    await expect(canvas.getByText('Cove')).toBeVisible();
    await expect(canvas.queryByText(/signed in/)).toBeNull();
    await expect(canvas.queryByText(/preview/i)).toBeNull();
    await expect(canvas.queryByText(/microphone|speaker/i)).toBeNull();
  },
};

export const UnusableProviderSaysWhy: Story = {
  args: { voice: { status: 'loaded', settings: unusableVoice } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/signed in/)).toBeVisible();
  },
};

export const SwitchOffTurnsOnAgain: Story = {
  args: {
    voice: { status: 'loaded', settings: { ...usableVoice, enabled: false } },
  },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch', voiceCalls)).not.toBeChecked();
    await userEvent.click(canvas.getByRole('switch', voiceCalls));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(true);
  },
};

export const TurnsVoiceCallsOff: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('switch', voiceCalls));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(false);
  },
};
