import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import { VoiceDetailView } from './voice-detail-view';
import {
  namedDevices,
  unnamedDevices,
  usableVoice,
} from './voice-detail-view-fixtures';
import { voiceDetailSpies } from './voice-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Voice/Devices',
  component: VoiceDetailView,
  parameters: { screenPreview: true },
  args: {
    voice: { status: 'loaded', settings: usableVoice },
    devices: namedDevices,
    ...voiceDetailSpies(),
  },
  beforeEach: (): Promise<void> => settleLayout(layoutWidths.wide),
} satisfies Meta<typeof VoiceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The choices a picker opened, which draw outside the canvas.
const opened = (canvasElement: HTMLElement): ReturnType<typeof within> =>
  within(canvasElement.ownerDocument.body);

const microphone = { name: /^Microphone/ };

const speaker = { name: /^Speaker/ };

const systemDefault = 'System default';

export const ShowsTheChosenMicrophoneAndTheSystemSpeaker: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', microphone)).toHaveTextContent(
      'USB Microphone',
    );
    await expect(canvas.getByRole('button', speaker)).toHaveTextContent(
      systemDefault,
    );
    await expect(canvas.queryByText(/names appear/i)).toBeNull();
  },
};

export const OffersTheSystemDefaultFirst: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', speaker));

    const options = await opened(canvasElement).findAllByRole('option');
    await expect(options).toHaveLength(3);
    await expect(options[0]).toHaveTextContent(systemDefault);
    await expect(options[1]).toHaveTextContent('MacBook Pro Speakers');
    await expect(options[2]).toHaveTextContent('AirPods Pro');
  },
};

export const ChoosesASpeaker: Story = {
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', speaker));
    await opened(canvasElement).findAllByText('AirPods Pro');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    await expect(args.onDevicesChange).toHaveBeenCalledWith({
      speaker: 'spk-headphones',
    });
  },
};

export const ChoosesTheSystemMicrophoneAgain: Story = {
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', microphone));
    await opened(canvasElement).findAllByText('MacBook Pro Microphone');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{Enter}');
    await expect(args.onDevicesChange).toHaveBeenCalledWith({
      microphone: null,
    });
  },
};

export const SaysNamesAppearAfterTheFirstCall: Story = {
  args: { devices: unnamedDevices },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/names appear/i)).toBeVisible();
    await expect(canvas.getByRole('button', microphone)).toHaveTextContent(
      systemDefault,
    );
  },
};

export const LeavesDevicesOutWhereTheAppCannotHoldACall: Story = {
  args: { devices: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Cove')).toBeVisible();
    await expect(canvas.queryByRole('button', microphone)).toBeNull();
    await expect(canvas.queryByRole('button', speaker)).toBeNull();
  },
};
