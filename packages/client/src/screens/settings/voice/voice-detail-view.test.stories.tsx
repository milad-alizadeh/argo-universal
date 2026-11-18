import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { VoiceDetailView } from './voice-detail-view';
import {
  stableVoice,
  unusableVoice,
  usableVoice,
} from './voice-detail-view-fixtures';

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
    await expect(canvas.getAllByRole('switch')).toHaveLength(1);
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
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

// The choices a picker opened, which draw outside the canvas.
const opened = (canvasElement: HTMLElement): ReturnType<typeof within> =>
  within(canvasElement.ownerDocument.body);

export const LabelsAnExperimentalProvider: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /^Voice provider/ }),
    );
    await expect(
      await opened(canvasElement).findAllByText(/GPT-Live.*experimental/i),
    ).toHaveLength(2);
  },
};

export const LeavesAStableProviderUnlabelled: Story = {
  args: { voice: { status: 'loaded', settings: stableVoice } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /^Voice provider/ }),
    );
    await expect(
      await opened(canvasElement).findAllByText('GPT-Live'),
    ).toHaveLength(2);
    await expect(opened(canvasElement).queryByText(/experimental/i)).toBeNull();
  },
};

export const ChoosesTheSecondVoice: Story = {
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /^Voice(?! provider)/ }),
    );
    const marin = await opened(canvasElement).findByText('Marin');
    await settleOverlays(marin);
    await userEvent.click(marin);
    await expect(args.onVoiceChange).toHaveBeenCalledWith('marin');
    await expect(args.onProviderChange).not.toHaveBeenCalled();
  },
};
