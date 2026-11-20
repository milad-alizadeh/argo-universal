import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { within } from 'storybook/test';
import { VoiceDetailView } from './conversation-detail-view';
import {
  adding,
  customVoices,
  editing,
  idleMeters,
  namedDevices,
  speakingMeters,
  testingMeters,
  unnamedDevices,
  unusableVoice,
  usableVoice,
} from './conversation-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Voice',
  component: VoiceDetailView,
  argTypes: {
    voice: { control: false },
    devices: { control: false },
    meters: { control: false },
    editor: { control: false },
    adjustsGain: { control: 'boolean' },
    saving: { control: 'boolean' },
    error: { control: 'text' },
  },
  parameters: { screenPreview: true },
  args: {
    voice: { status: 'loaded', settings: usableVoice },
    adjustsGain: true,
    onEnabledChange: action('turn Voice calls on or off'),
    onProviderChange: action('choose the Voice provider'),
    onVoiceChange: action('choose the voice'),
    onPreviewVoice: action('play a voice'),
    onInstructionsChange: action('keep the instructions'),
    onCallOptionsChange: action('change the call options'),
    onEditorChange: action('open or close the custom voice form'),
    onSaveCustomVoice: action('save a custom voice'),
    onDeleteCustomVoice: action('delete a custom voice'),
    onPreviewCustomVoice: action('play a custom voice'),
    onDevicesChange: action('choose the microphone or speaker'),
    onRetry: action('retry loading Voice settings'),
  },
} satisfies Meta<typeof VoiceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0];

// Opens the Voice row's popover, which draws outside the canvas.
async function openVoices({
  canvas,
  canvasElement,
  userEvent,
}: Canvas): Promise<ReturnType<typeof within>> {
  await userEvent.click(canvas.getByRole('link', { name: /^Voice/ }));
  const page = within(canvasElement.ownerDocument.body);
  await page.findByRole('searchbox', { name: 'Search voices' });

  return page;
}

export const UsableProvider: Story = {};

// The person's own voices, one of them chosen, and instructions for every call.
export const CustomVoices: Story = {
  args: { voice: { status: 'loaded', settings: customVoices } },
};

// The Voice row's popover: the person's voices with play and edit, a row to add one, then the provider's.
export const VoicePopover: Story = {
  args: { voice: { status: 'loaded', settings: customVoices } },
  play: async (context) => {
    await openVoices(context);
  },
};

// A search narrows the popover by name and description.
export const Searching: Story = {
  args: { voice: { status: 'loaded', settings: customVoices } },
  play: async (context) => {
    const page = await openVoices(context);
    await context.userEvent.type(
      page.getByRole('searchbox', { name: 'Search voices' }),
      'calm',
    );
  },
};

export const Adding: Story = {
  args: { voice: { status: 'loaded', settings: customVoices }, editor: adding },
};

export const Editing: Story = {
  args: {
    voice: { status: 'loaded', settings: customVoices },
    editor: editing,
  },
};

// Where this App carries no call's sound, it cannot change the microphone's gain or draw a call.
export const GainHidden: Story = {
  args: { adjustsGain: false },
};

export const UnusableProvider: Story = {
  args: { voice: { status: 'loaded', settings: unusableVoice } },
};

export const SwitchOff: Story = {
  args: {
    voice: { status: 'loaded', settings: { ...usableVoice, enabled: false } },
  },
};

export const Saving: Story = { args: { saving: true } };

export const Loading: Story = { args: { voice: { status: 'loading' } } };

export const LoadError: Story = { args: { voice: { status: 'error' } } };

export const Disconnected: Story = {
  args: { voice: { status: 'disconnected' } },
};

// Where the App holds the call: the desktop App chooses its microphone and speaker.
export const MicrophoneAndSpeaker: Story = { args: { devices: namedDevices } };

// Before the microphone was allowed once, the browser has not named its devices.
export const UnnamedDevices: Story = { args: { devices: unnamedDevices } };

export const ChangeError: Story = {
  args: { error: 'There is no voice nobody' },
};

// Paper "Option D": each device's level after its name, and the Speaker's test sound at the row's end.
export const MetersIdle: Story = {
  args: { devices: namedDevices, meters: idleMeters },
};

export const MicrophoneMidSpeech: Story = {
  args: { devices: namedDevices, meters: speakingMeters },
};

export const TestSoundPlaying: Story = {
  args: { devices: namedDevices, meters: testingMeters },
};
