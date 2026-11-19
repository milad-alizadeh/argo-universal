import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { syntheticVoiceAudio } from '../../../../../mocks/voice/synthetic-voice-audio';
import { VoiceEdgeBand } from './voice-edge-band';

// Sound with no microphone and no voice, so the band scrolls as it would on a call.
const { spectrum } = syntheticVoiceAudio();

const connected = {
  orb: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

const meta = {
  title: 'Voice/VoiceEdgeBand',
  component: VoiceEdgeBand,
  render: (args): React.JSX.Element => (
    <View className="w-160 bg-card">
      <VoiceEdgeBand {...args} />
    </View>
  ),
  args: { call: connected, elapsed: '2:43', spectrum },
  argTypes: { spectrum: { control: false } },
} satisfies Meta<typeof VoiceEdgeBand>;

export default meta;

type Story = StoryObj<typeof meta>;

// Connecting: a dim line with one soft highlight sweeping across, and no timer until the call connects.
export const Connecting: Story = {
  args: { call: { ...connected, orb: 'none' } },
};

// Listening: the person's microphone level, newest on the right, scrolling left.
export const Listening: Story = {};

// Talking: the voice's output, in info blue.
export const Talking: Story = {
  args: { call: { ...connected, orb: 'talking' }, elapsed: '2:51' },
};

// Thinking: low bars breathing in a slow wave.
export const Thinking: Story = {
  args: { call: { ...connected, orb: 'thinking' }, elapsed: '3:02' },
};

// Muted: the line goes flat and red.
export const Muted: Story = {
  args: { call: { ...connected, microphoneMuted: true }, elapsed: '3:10' },
};

// Reconnecting: a warning sweep, and the timer keeps counting.
export const Reconnecting: Story = {
  args: {
    call: { ...connected, orb: 'none', trouble: 'reconnecting' },
    elapsed: '3:14',
  },
};
