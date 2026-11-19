import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { VoiceDetailView } from './voice-detail-view';
import {
  describedVoice,
  unusableVoice,
  usableVoice,
} from './voice-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Voice',
  component: VoiceDetailView,
  argTypes: {
    voice: { control: false },
    saving: { control: 'boolean' },
    error: { control: 'text' },
  },
  parameters: { screenPreview: true },
  args: {
    voice: { status: 'loaded', settings: usableVoice },
    onEnabledChange: action('turn Voice calls on or off'),
    onProviderChange: action('choose the Voice provider'),
    onVoiceChange: action('choose the voice'),
    onRetry: action('retry loading Voice settings'),
  },
} satisfies Meta<typeof VoiceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UsableProvider: Story = {};

export const DescribedVoice: Story = {
  args: { voice: { status: 'loaded', settings: describedVoice } },
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

export const ChangeError: Story = {
  args: { error: 'There is no voice nobody' },
};
