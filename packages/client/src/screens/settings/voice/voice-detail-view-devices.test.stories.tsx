import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { VoiceDetailView } from './voice-detail-view';
import {
  idleMeters,
  namedDevices,
  speakingMeters,
  testingMeters,
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
    adjustsGain: true,
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

const lit = (glyph: HTMLElement): number =>
  glyph.querySelectorAll('[data-testid="field-picker-meter-lit"]').length;

// Paper "Option D": a level glyph on each row, and a play button on the Speaker row alone.
export const ShowsEachDevicesLevel: Story = {
  args: { meters: speakingMeters },
  play: async ({ canvas }) => {
    const [microphoneGlyph, speakerGlyph] =
      canvas.getAllByTestId('field-picker-meter');
    await expect(lit(microphoneGlyph)).toBe(5);
    await expect(lit(speakerGlyph)).toBe(0);
    await expect(
      canvas.getAllByRole('button', { name: /test sound/ }),
    ).toHaveLength(1);
  },
};

export const PlaysTheTestSound: Story = {
  args: { meters: { ...idleMeters, onTest: fn() } },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Play a test sound' }),
    );
    await expect(args.meters?.onTest).toHaveBeenCalledOnce();
    await expect(args.onDevicesChange).not.toHaveBeenCalled();
  },
};

export const StopsTheTestSoundWhilePlaying: Story = {
  args: { meters: { ...testingMeters, onTest: fn() } },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Stop the test sound' }),
    );
    await expect(args.meters?.onTest).toHaveBeenCalledOnce();
  },
};

// A phone, or the web App in a phone's browser, has no audio settings: no devices, meters, volume or gain.
export const PhonesShowNoAudioRows: Story = {
  args: { meters: idleMeters, visualiser: { kind: 'orb', onChange: fn() } },
  beforeEach: (): Promise<void> => settleLayout(layoutWidths.phone),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Visualiser')).toBeVisible();
    await expect(canvas.queryByText('Devices')).toBeNull();
    await expect(canvas.queryByRole('button', microphone)).toBeNull();
    await expect(canvas.queryByRole('button', speaker)).toBeNull();
    await expect(canvas.queryByText('Volume')).toBeNull();
    await expect(canvas.queryByText('Microphone gain')).toBeNull();
    await expect(canvas.queryByTestId('field-picker-meter')).toBeNull();
  },
};
